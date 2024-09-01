import { useCallback, useEffect, useState } from "preact/hooks";
import { fetchHelper } from "./fetch-helper.js";

class GameClient {
    constructor(game) {
        this._game = game;
        this._gameStateCache = new Map();
        this._gameInfoHandlers = new Set();
    }

    onGameInfoUpdate(handler) {
        this._gameInfoHandlers.add(handler);

        return () => this._gameInfoHandlers.delete(handler);
    }

    pollGameInfo() {
        this._gameInfo = undefined;
        // Fetch the new data and trigger an event when it's done
        this.getGameInfo()
            .catch(() => {})
            .then(() => this._triggerGameInfoUpdate());
    }

    _triggerGameInfoUpdate() {
        for(const handler of this._gameInfoHandlers) {
            handler();
        }
    }

    async getGameInfo() {
        if(this._gameInfo === undefined) {
            this._gameInfo = await fetchHelper(`/api/game/${this._game}/`);
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

        return await fetchHelper(`/api/game/${this._game}/possible-actions/${user}/${logBook.getLastEntryId()}`);
    }

    async submitTurn(logBookEntry) {
        const result = await fetchHelper(`/api/game/${this._game}/turn`, {
            body: logBookEntry
        });

        this.pollGameInfo();

        return result.entry;
    }

    async reloadGame() {
        await fetchHelper(`/api/game/${this._game}/reload`);
        this.invalidateCache();
    }

    invalidateCache() {
        this._gameStateCache = new Map();
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
    await fetchHelper("/api/games/reload");

    for(const client of gameClients.values()) {
        client.invalidateCache();
    }
}

export function useGameClient(game, handler, dependencies=[]) {
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
                });
        }
    }, [setResult, setError, client, wrappedHandler]);

    useEffect(() => {
        callHandler();

        if(client) {
            return client.onGameInfoUpdate(() => callHandler());
        }
    }, [callHandler, client]);

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
