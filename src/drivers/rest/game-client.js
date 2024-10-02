/* globals console */
import { useCallback, useEffect, useState } from "preact/hooks";
import { fetchHelper } from "./fetch-helper.js";
import { deserializer } from "../../deserialization.js";
import { LogBookSlice } from "../../game/state/log-book/log-book.js";

class GameClient {
    constructor(game) {
        this._game = game;
        this._gameStateCache = new Map();
        this._gameInfoHandlers = new Set();
        this._possibleActionHandlers = new Set();
    }

    onGameInfoUpdate(handler) {
        this._gameInfoHandlers.add(handler);

        return () => this._gameInfoHandlers.delete(handler);
    }

    onPossibleActionUpdate(name, handler) {
        const registration = {name, handler};
        this._possibleActionHandlers.add(registration);

        return () => this._possibleActionHandlers.delete(registration);
    }

    pollGameInfo() {
        this._gameInfo = undefined;
        // Fetch the new data and trigger an event when it's done
        this.getGameInfo()
            .catch(() => {})
            .then(gameInfo => {
                this._triggerGameInfoUpdate();

                if(gameInfo && gameInfo.logBook.getLastEntryId() != this._lastLastEntryId) {
                    this._lastLastEntryId = gameInfo.logBook.getLastEntryId();
                    this._triggerPossibleActionsUpdate();
                }
            });
    }

    _triggerGameInfoUpdate() {
        for(const handler of this._gameInfoHandlers) {
            handler();
        }
    }

    _triggerPossibleActionsUpdate(user) {
        for(const registration of this._possibleActionHandlers) {
            if(user === undefined || user === registration.name) {
                registration.handler();
            }
        }
    }

    async getGameInfo() {
        if(this._gameInfo === undefined) {
            let cacheParams = "";
            if(this._cacheInfo !== undefined) {
                cacheParams = `?gameLoadedAt=${this._cacheInfo.gameLoadedAt}&lastEntryId=${this._cacheInfo.logBook.getLastEntryId()}`;
            }

            this._gameInfo = await fetchHelper(`/api/game/${this._game}${cacheParams}`);

            if(this._gameInfo.logBook instanceof LogBookSlice) {
                this._gameInfo.logBook = this._gameInfo.logBook.apply(this._cacheInfo.logBook);
            }

            this._cacheInfo = {
                gameLoadedAt: this._gameInfo.gameLoadedAt,
                logBook: this._gameInfo.logBook,
            };
        }

        return this._gameInfo;
    }

    async getGameState(entryId) {
        if(!this._gameStateCache.has(entryId)) {
            this._gameStateCache.set(entryId, await fetchHelper(`/api/game/${this._game}/turn/${entryId}`));
        }

        return this._gameStateCache.get(entryId);
    }

    async getPossibleActions(user) {
        const {logBook} = await this.getGameInfo();

        const actions = await fetchHelper(`/api/game/${this._game}/possible-actions/${user}/${logBook.getLastEntryId()}`);

        // If any of these errors expire refresh the possible actions when they do
        const timeToRefresh = actions
            .flatMap(action => action.getErrors())
            .map(error => error.getTimeToExpiration())
            .filter(expiration => !isNaN(expiration))
            .reduce((minTime, time) => Math.min(minTime, time), Infinity);

        clearTimeout(this._possibleActionsRefreshHandle);
        if(timeToRefresh < Infinity) {
            this._possibleActionsRefreshHandle = setTimeout(() => this._triggerPossibleActionsUpdate(user), timeToRefresh);
        }

        return actions;
    }

    async submitTurn(logBookEntry) {
        const result = await fetchHelper(`/api/game/${this._game}/turn`, {
            body: deserializer.serialize(logBookEntry),
        });

        this.pollGameInfo();

        return result.entry;
    }

    async reloadGame() {
        await fetchHelper(`/api/game/${this._game}/reload`, { method: "POST" });
        this.invalidateCache();
    }

    invalidateCache() {
        this._gameStateCache = new Map();
        this._lastLastEntryId = undefined;
        this.pollGameInfo();
    }
}


let gameClients = new Map();

export function getGameClient(game) {
    if(!gameClients.has(game)) {
        gameClients.set(game, new GameClient(game));
    }

    return gameClients.get(game);
}

export async function reloadAllGames() {
    await fetchHelper("/api/games/reload", { method: "POST" });

    for(const client of gameClients.values()) {
        client.invalidateCache();
    }
}

export function useGameClient(game, handler, dependencies=[], { possibleActionsUser } = {}) {
    const [result, setResult] = useState(undefined);
    const [error, setError] = useState(undefined);

    const client = game && getGameClient(game);

    const wrappedHandler = useCallback(handler, dependencies);  // eslint-disable-line

    const callHandler = useCallback(() => {
        if(client) {
            Promise.resolve(wrappedHandler(client))
                .then(data => {
                    setResult(data);
                    setError(undefined);
                })
                .catch(err => {
                    setResult(undefined);
                    setError(err);
                    console.error(err);
                });
        }
    }, [setResult, setError, client, wrappedHandler]);

    useEffect(() => {
        callHandler();

        if(client) {
            if(possibleActionsUser !== undefined) {
                return client.onPossibleActionUpdate(possibleActionsUser, () => callHandler());
            }
            else {
                return client.onGameInfoUpdate(() => callHandler());
            }
        }
    }, [callHandler, client, possibleActionsUser]);

    return [result, error];
}

export function usePollingFor(game, intervalSeconds) {
    const client = game && getGameClient(game);

    useEffect(() => {
        if(client) {
            const handle = setInterval(() => client.pollGameInfo(), intervalSeconds * 1000);
            return () => clearInterval(handle);
        }
    }, [client, intervalSeconds]);
}
