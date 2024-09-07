import { Position } from "../../game/state/board/position.js";
import { PlayerRef } from "../../game/state/players/player.js";
import { buildPosition } from "./board-state-main.js";

const COUNCIL_ACTIONS = ["bounty", "grant_life", "stimulus"];

function convertSubject(logEntry) {
    return {
        ...logEntry.rawLogEntry,
        subject: COUNCIL_ACTIONS.includes(logEntry.type) ? "Council" : logEntry.rawLogEntry.subject,
    };
}

function convertToEngineEntry(logEntry) {
    logEntry = Object.assign({}, logEntry);

    // Attempt to parse a target as a position and then switch to a player ref
    if(logEntry.target !== undefined) {
        try {
            // Check if this is a valid position
            new Position(logEntry.target);

            logEntry.target_position = logEntry.target;
            delete logEntry.target;
        }
        catch(err) {
            logEntry.target_player = logEntry.target;
            delete logEntry.target;
        }
    }

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

export function convertLogEntry(logEntry, isMainBranch) {
    logEntry = logEntry.withoutStateInfo();

    if(isMainBranch) {
        logEntry = convertToEngineEntry(logEntry.rawLogEntry);
    }
    else {
        logEntry = convertSubject(logEntry);
    }

    return logEntry;
}
