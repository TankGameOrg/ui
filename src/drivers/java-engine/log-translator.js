import { Position } from "../../game/state/board/position.js";
import { buildPosition } from "./board-state.js";


function convertToEngineEntry(logEntry) {
    logEntry = Object.assign({}, logEntry);

    if(logEntry.target_position !== undefined) {
        logEntry.target_position = buildPosition(new Position(logEntry.target_position));
    }

    if(logEntry.target_player !== undefined) {
        logEntry.target_player = {
            "class": "PlayerRef",
            "name": logEntry.target_player,
        };
    }

    let subject;
    if(logEntry.subject !== undefined) {
        subject = {
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
    }

    return {
        ...logEntry,
        subject,
    };
}

export function convertLogEntry(logEntry) {
    logEntry = logEntry.withoutStateInfo();
    return convertToEngineEntry(logEntry.rawLogEntry);
}
