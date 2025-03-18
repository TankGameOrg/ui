import { logger } from "#platform/logging.js";
import { prettyifyName } from "../../../utils.js";

class LogEntryFormatter {
    constructor(formatFunctions = {}) {
        this._formatFunctions = formatFunctions;
    }

    format(logEntry, gameState) {
        const formatFunction = this._formatFunctions[logEntry.type];
        if(!formatFunction) {
            logger.warn({ msg: `Missing formatter for ${logEntry.type}`, logEntry });
            return `Log entry type ${logEntry.type} is not supported`;
        }

        return formatFunction(logEntry.rawLogEntry, new FormatingHelpers(gameState, logEntry));
    }
}

class FormatingHelpers {
    static UNIT_ONLY = { unit: true, floor: false }
    static FLOOR_ONLY = { unit: false, floor: true }
    static UNIT_AND_FLOOR = { unit: true, floor: true }

    constructor(gameState, logEntry) {
        this._gameState = gameState;
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
            if(unitAtLocation) {
                if(unitAtLocation.type == "tank") {
                    info = unitAtLocation.playerRef?.getPlayer?.(this._gameState)?.name;

                    if(unitAtLocation.unit.dead) {
                        info += " [dead]";
                    }
                }
                else {
                    info = unitAtLocation.type;
                }
            }
        }

        if(!info && floor) {
            const floorTileAtLocation = this._gameState.board.getFloorTileAt(position);
            if(floorTileAtLocation && floorTileAtLocation.type != "empty") {
                info = floorTileAtLocation.type;
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


// Common log entries
function shoot(entry, formatter) {
    const verb = entry.hit || entry.hit === undefined ? "shot" : "missed";
    const target = formatter.describeLocation();

    let damageInfo = "";
    if(entry.damage !== undefined) {
        damageInfo = ` dealing ${entry.damage} damage`;
    }

    return `${entry.subject} ${verb}${damageInfo} ${target}${formatter.dieRoll("hit_roll", { prefix: " [", suffix: "]" })}`
}

const commonLogEntryFormatters = {
    shoot,
    start_of_day: entry => `Start of day ${entry.day}`,
    buy_action: entry => `${entry.subject} traded ${entry.gold} gold for actions`,
    donate: entry => `${entry.subject} donated ${entry.donation} pre-tax gold to ${entry.target_player}`,
    upgrade_range: entry => `${entry.subject} upgraded their range`,
    bounty: entry => `${entry.subject} placed a ${entry.bounty} gold bounty on ${entry.target_player}`,
    stimulus: entry => `${entry.subject} granted a stimulus of 1 action to ${entry.target_player}`,
    grant_life: entry => `${entry.subject} granted 1 life to ${entry.target_player}`,
    spawn_wall: entry => `${entry.subject} spawned a wall at ${entry.target_position}`,
    spawn_lava: entry => `${entry.subject} spawned a lava at ${entry.target_position}`,
    smite: entry => `${entry.subject} smote ${entry.target_player}`,
    heal: entry => `${entry.subject} healed ${entry.target_player}`,
    slow: entry => `${entry.subject} slowed ${entry.target_player}`,
    hasten: entry => `${entry.subject} hastened ${entry.target_player}`,
    move: (entry, formatter) =>`${entry.subject} moved to ${formatter.describeLocation(LogEntryFormatter.FLOOR_ONLY)}`,
    loot: (entry, formatter) => `${entry.subject} looted ${formatter.describeLocation(LogEntryFormatter.UNIT_ONLY)}`,
};


export const defaultFormatter = new LogEntryFormatter(commonLogEntryFormatters);
