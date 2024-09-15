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
    static ENTRY_ONLY = { entry: true, floor: false }
    static FLOOR_ONLY = { entry: false, floor: true }
    static ENTRY_AND_FLOOR = { entry: true, floor: true }

    constructor(gameState, version, logEntry) {
        this._gameState = gameState;
        this._version = version;
        this._logEntry = logEntry;
    }

    describeLocation({ location, entity = true, floor = false } = {}) {
        if(location === undefined) {
            location = this._logEntry.rawLogEntry.target_position;
        }

        if(this._gameState === undefined) return location;
        const position = new Position(location);

        let info;
        if(entity) {
            const entityAtLocation = this._gameState.board.getEntityAt(position);
            // Don't set info for empty entities so players can see the floor
            if(entityAtLocation && entityAtLocation.type != "empty") {
                const descriptor = this._version.getEntityDescriptor(entityAtLocation, this._gameState);
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
        if(!info) return location;

        info = prettyifyName(info, { capitalize: false });

        return `${location} (${info})`;
    }

    dieRoll(field, { prefix="", suffix="" }) {
        const roll = this._logEntry.dieRolls?.[field];
        if(!roll) return "";

        return `${prefix}${roll.map(dieSide => dieSide.display).join(", ")}${suffix}`;
    }
}
