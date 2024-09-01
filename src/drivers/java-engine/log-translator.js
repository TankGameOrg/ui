import { Position } from "../../game/state/board/position.js";
import { buildPosition } from "./board-state-main.js";

const COUNCIL_ACTIONS = ["bounty", "grant_life", "stimulus"];

function convertSubject(logEntry) {
    return {
        ...logEntry.rawLogEntry,
        subject: COUNCIL_ACTIONS.includes(logEntry.type) ? "Council" : logEntry.rawLogEntry.subject,
    };
}

function convertToEngineEntry(logEntry) {
    // Attempt to parse a target as a position and then switch to a player ref
    let target;
    if(logEntry.target !== undefined) {
        try {
            target = buildPosition(new Position(logEntry.target));
        }
        catch(err) {
            target = {
                "class": "PlayerRef",
                "name": logEntry.target,
            };
        }
    }

    let subject;
    if(logEntry.subject !== undefined) {
        subject = {
            "class": "PlayerRef",
            "name": logEntry.subject,
        };
    }

    return {
        ...logEntry,
        target,
        subject,
        hit_roll: undefined,
        damage_roll: undefined,
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
