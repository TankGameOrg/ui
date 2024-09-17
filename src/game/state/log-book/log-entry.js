import { deserializer } from "../../../deserialization.js";
import { Dice } from "../../possible-actions/die.js";
import { Position } from "../board/position.js";
import Player, { PlayerRef } from "../players/player.js";

export class LogEntry {
    constructor(rawLogEntry, message, dieRolls) {
        if(rawLogEntry.class !== undefined) throw new Error("Class present");

        this.type = rawLogEntry.action || "start_of_day";
        this.rawLogEntry = rawLogEntry;
        this.dieRolls = dieRolls;
        this.message = message;

        if(this.rawLogEntry.timestamp === undefined) {
            this.rawLogEntry.timestamp = LogEntry.makeTimeStamp();
        }
    }

    static deserialize(rawEntry) {
        let message;
        let dieRolls;
        if(rawEntry.savedData !== undefined) {
            message = rawEntry.savedData.message;
            dieRolls = rawEntry.savedData.dieRolls;
            rawEntry = Object.assign({}, rawEntry);
            delete rawEntry.savedData;
        }

        return new LogEntry(rawEntry, message, dieRolls);
    }

    serialize() {
        if(this.message == undefined) {
            return Object.assign({}, this.rawLogEntry);
        }

        return {
            ...this.rawLogEntry,
            savedData: {
                message: this.message,
                dieRolls: this.dieRolls,
            }
        }
    }

    static makeTimeStamp() {
        return Math.floor(Date.now() / 1000);
    }

    static enableTestModeTimeStamps() {
        let lastTime = 0;
        LogEntry.makeTimeStamp = () => {
            lastTime += 20 * 60; // 20 minutes in seconds
            return lastTime;
        };
    }

    withoutStateInfo() {
        return new LogEntry(this.rawLogEntry);
    }

    getTimestamp() {
        return new Date(this.rawLogEntry.timestamp * 1000);
    }

    updateMessageWithBoardState({ logEntryFormatter, previousState, actions }) {
        this.dieRolls = {};
        const rollFields = Object.keys(this.rawLogEntry)
            .map(key => ({ key, value: this.rawLogEntry[key] }))
            .filter(field => field.value?.type == "die-roll");

        for(const rollField of rollFields) {
            const action = actions.find(action => action.getActionName() == this.type);
            if(action) {
                const dice = action.getDiceFor(rollField.key, {
                    rawLogEntry: this.rawLogEntry,
                });

                this.dieRolls[rollField.key] = Dice.expandAll(dice)
                    .map((die, idx) => die.getSideFromValue(rollField.value.roll[idx]));
            }
        }

        this.message = logEntryFormatter.formatLogEntry(this, previousState);
    }

    finalizeEntry({ actions }) {
        const action = actions.find(action => action.getActionName() == this.type);

        for(const field of Object.keys(this.rawLogEntry)) {
            const value = this.rawLogEntry[field];

            // Roll any unrolled dice
            if(value?.type == "die-roll" && !value.manual) {
                const dice = action.getDiceFor(field, {
                    rawLogEntry: this.rawLogEntry,
                });

                const expandedDice = Dice.expandAll(dice);
                this.rawLogEntry[field].roll = expandedDice.map(die => die.roll());
            }
        }

        // Apply any version specific transforms before submitting
        const newRawEntry = action?.finalizeLogEntry?.(this.rawLogEntry);
        if(newRawEntry) {
            this.rawLogEntry = newRawEntry
        }
    }
}

deserializer.registerDeserializer("log-entry-v1", (rawLogEntry, helpers) => {
    helpers.updatedContent();

    // Attempt to parse a target as a position and then switch to a player ref
    if(rawLogEntry.target !== undefined) {
        try {
            // Check if this is a valid position
            new Position(rawLogEntry.target);

            rawLogEntry.target_position = rawLogEntry.target;
            delete rawLogEntry.target;
        }
        catch(err) {
            rawLogEntry.target_player = rawLogEntry.target;
            delete rawLogEntry.target;
        }
    }

    return translateV2to3(rawLogEntry, helpers);
});

function translateV2to3(rawLogEntry, helpers) {
    // helpers.updatedContent(); // TODO: Uncomment

    if(rawLogEntry.target_player !== undefined) {
        rawLogEntry.target_player = new PlayerRef({
            name: rawLogEntry.target_player,
        });
    }

    if(rawLogEntry.target_position !== undefined) {
        rawLogEntry.target_position = new Position(rawLogEntry.target_position);
    }

    return LogEntry.deserialize(rawLogEntry);
}

deserializer.registerDeserializer("log-entry-v2", translateV2to3);

deserializer.registerClass("log-entry-v3", LogEntry);