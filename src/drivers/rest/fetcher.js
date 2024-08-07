/* globals window, location, history, fetch */
import { useCallback, useEffect, useState } from "preact/hooks";
import "../../game/state/log-book/log-book.js";
import "../../game/open-hours/index.js";
import "../../game/state/game-state.js";
import "../../game/state/log-book/log-entry.js";
import { deserializer } from "../../deserialization.js";

const FETCH_FREQUENCY = 2; // seconds

export class ServerError extends Error {
    constructor(error) {
        super(typeof error == "string" ? error : error.message);

        if(typeof error == "object") {
            this.code = error.code;
            this.rawError = error;
        }
    }
}

function makeReactDataFetchHelper(options) {
    return (...args) => {
        const [data, setData] = useState();
        const [error, setError] = useState();

        const fetchData = useCallback(async () => {
            try {
                if(options.resetBeforeFetch) {
                    setData(undefined);
                    setError(undefined);
                }

                if(options.shouldSendRequest && !options.shouldSendRequest(...args)) {
                    return;
                }

                let url = options.url;
                if(typeof options.url === "function") {
                    url = options.url(...args);
                }

                const res = await fetch(url);

                if(!res.ok) {
                    setData(undefined);
                    setError(new Error(`Failed to load data got ${res.statusText} (code: ${res.status})`));
                    return;
                }

                let recievedData = deserializer.deserialize(await res.json());

                if(recievedData.error) {
                    setData(undefined);
                    setError(new ServerError(recievedData.error));
                    return;
                }

                setData(recievedData);
                setError(undefined);
            }
            catch(err) {
                setError(err);
                setData(undefined);
            }
        }, args.concat([setData, setError]));  // eslint-disable-line

        useEffect(() => {
            fetchData();

            if(options.frequency) {
                const handle = setInterval(fetchData, options.frequency * 1000 /* seconds to ms */);
                return () => clearInterval(handle);
            }
        }, [fetchData]);

        return [data, error];
    };
}

export const useGameList = makeReactDataFetchHelper({
    url: "/api/games",
    frequency: FETCH_FREQUENCY,
});

export const useGameInfo = makeReactDataFetchHelper({
    shouldSendRequest: game => game !== undefined,
    url: game => `/api/game/${game}/`,
    frequency: FETCH_FREQUENCY,
});

export const useGameState = makeReactDataFetchHelper({
    shouldSendRequest: (game, entryId) => game !== undefined && entryId !== undefined,
    url: (game, entryId) => `/api/game/${game}/turn/${entryId}`,
});

export const usePossibleActionFactories = makeReactDataFetchHelper({
    resetBeforeFetch: true,
    shouldSendRequest: (game, user, entryId) => game !== undefined && user !== undefined && entryId !== undefined,
    url: (game, user, entryId) => `/api/game/${game}/possible-actions/${user}/${entryId}`,
});

export const useAvilableEngines = makeReactDataFetchHelper({
    url: "/api/engine/",
    frequency: FETCH_FREQUENCY,
});

async function fetchHelper(url, jsonBody) {
    let opts = {};

    if(jsonBody !== undefined) {
        opts = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(jsonBody),
        };
    }

    const res = await fetch(url, opts);
    const result = deserializer.deserialize(await res.json());

    if(!result.success) throw new Error(result.error);

    return result;
}

export async function submitTurn(game, logBookEntry) {
    const result = await fetchHelper(`/api/game/${game}/turn`, logBookEntry);
    return result.entry;
}

export async function reloadGame(gameName) {
    await fetchHelper(`/api/game/${gameName}/reload`);
}

export async function reloadAllGames() {
    await fetchHelper("/api/games/reload");
}

export async function selectEngineForVersion(gameVersion, engineId) {
    await fetchHelper(`/api/engine/game-version/${gameVersion}`, {
        engineId,
    });
}