/* globals window, location, history, fetch */
import { useCallback, useEffect, useState } from "preact/hooks";
import "../../game/state/log-book/log-book.js";
import "../../game/open-hours/index.js";
import "../../game/state/game-state.js";
import "../../game/state/log-book/log-entry.js";
import "../../game/possible-actions/action-error.js";
import { deserializer } from "../../deserialization.js";
import { ServerError } from "./fetch-helper.js";

const FETCH_FREQUENCY = 2; // seconds

function makeReactDataFetchHelper(options) {
    return (...args) => {
        const [data, setData] = useState();
        const [error, setError] = useState();

        const fetchData = useCallback(async () => {
            try {
                const res = await fetch(options.url);

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

export async function selectEngineForVersion(gameVersion, engineId) {
    await fetchHelper(`/api/engine/game-version/${gameVersion}`, {
        engineId,
    });
}