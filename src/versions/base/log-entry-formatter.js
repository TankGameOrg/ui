import { logger } from "#platform/logging.js";
import { Position } from "../../game/state/board/position.js";
import { prettyifyName } from "../../utils.js";

export class LogEntryFormatter {
    constructor(formatFunctions = {}) {
        this._formatFunctions = formatFunctions;
    }

    format(logEntry, gameState, version) {
        const formatFunction = this._formatFunctions[logEntry.type];
        if(!formatFunction) {
            logger.warn({ msg: `Missing formatter for ${logEntry.type}`, logEntry });
            return `Log entry type ${logEntry.type} is not supported`;
        }

        return formatFunction(logEntry.rawLogEntry, new FormatingHelpers(gameState, version, logEntry));
    }
}

class FormatingHelpers {
    static UNIT_ONLY = { unit: true, floor: false }
    static FLOOR_ONLY = { unit: false, floor: true }
    static UNIT_AND_FLOOR = { unit: true, floor: true }

    constructor(gameState, version, logEntry) {
        this._gameState = gameState;
        this._version = version;
        this._logEntry = logEntry;
    }

    describeLocation({ position, unit = true, floor = false } = {}) {
        if(position === undefined) {
            position = this._logEntry.rawLogEntry.target_position;
        }

        if(this._gameState === undefined) return position;

        let info;
        if(unit) {
            const unitAtLocation = this._gameState.board.getUnitAt(position);
            // Don't set info for empty entities so players can see the floor
            if(unitAtLocation && unitAtLocation.type != "empty") {
                const descriptor = this._version.getUnitDescriptor(unitAtLocation, this._gameState);
                info = descriptor.formatForLogEntry();
            }
        }

        if(!info && floor) {
            const floorTileAtLocation = this._gameState.board.getFloorTileAt(position);
            if(floorTileAtLocation && floorTileAtLocation.type != "empty") {
                const descriptor = this._version.getFloorTileDescriptor(floorTileAtLocation);
                info = descriptor.formatForLogEntry();
            }
        }

        // Nothing here
        if(!info) info = "empty";

        // No info to give the user just return the location
        if(!info) return position.humanReadable;

        info = prettyifyName(info);

        return `${position.humanReadable} (${info})`;
    }

    dieRoll(field, { prefix="", suffix="" }) {
        const roll = this._logEntry.dieRolls?.[field];
        if(!roll) return "";

        return `${prefix}${roll.map(dieSide => dieSide.display).join(", ")}${suffix}`;
    }
}
