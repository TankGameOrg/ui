/* global fetch */
import { deserializer } from "../../deserialization.js";
import "../../game/state/log-book/log-book.js";
import "../../game/open-hours/index.js";
import "../../game/state/game-state.js";
import "../../game/state/log-book/log-entry.js";
import "../../game/possible-actions/action-error.js";
import "../../game/possible-actions/index.js";


export class ServerError extends Error {
    constructor(error) {
        super(typeof error == "string" ? error : error.message);

        if(typeof error == "object") {
            this.code = error.code;
            this.rawError = error;
        }
    }
}

export async function fetchHelper(url, opts = {}) {
    if(opts?.body !== undefined) {
        opts = {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(opts.body),
        };
    }

    opts.cache = "no-store";

    const res = await fetch(url, opts);

    if(!res.ok) {
        throw new Error(`Failed to load data got ${res.statusText} (code: ${res.status})`);
    }

    let recievedData = deserializer.deserialize(await res.json());

    if(recievedData.error) {
        throw new ServerError(recievedData.error);
    }

    return recievedData;
}
