import { Position } from "../../game/state/board/position.js";
import { PlayerRef } from "../../game/state/players/player.js";
import { encodePosition, encodePlayerRef } from "./board-state.js";


function convertToEngineEntry(_logEntry) {
    let logEntry = Object.assign({}, _logEntry);

    if(logEntry.subject !== undefined) {
        logEntry.subject = {
            "class": "PlayerRef",
            "name": logEntry.subject,
        };
    }

    for(const key of Object.keys(logEntry)) {
        if(logEntry[key].type == "die-roll") {
            logEntry[key] = {
                ...logEntry[key],
                type: undefined,
                class: "DieRollResult"
            };
        }

        if(logEntry[key] instanceof PlayerRef) {
            logEntry[key] = encodePlayerRef(logEntry[key]);
        }

        if(logEntry[key] instanceof Position) {
            logEntry[key] = encodePosition(logEntry[key]);
        }
    }

    return logEntry;
}

export function convertLogEntry(logEntry) {
    logEntry = logEntry.withoutStateInfo();
    return convertToEngineEntry(logEntry.rawLogEntry);
}
