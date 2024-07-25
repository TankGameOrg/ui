/* globals process */
import fs from "node:fs";
import { logger } from "#platform/logging.js";
import path from "node:path";
import * as boardStateMain from "./board-state-main.js";
import * as boardStateStable from "./board-state-stable.js";
import { JavaEngineSource } from "./possible-action-source.js";
import { JsonCommunicationChannel } from "../json-communication-channel.js";

const TANK_GAME_TIMEOUT = 3; // seconds
const ENGINE_NAME_EXPR = /TankGame-(.+?).jar$/;

const ENGINE_SEARCH_DIR = process.env.TANK_GAME_ENGINE_SEARCH_DIR || "engine";
const TANK_GAME_ENGINE_COMMAND = (function() {
    let command = process.env.TANK_GAME_ENGINE_COMMAND;

    if(!command) {
        const jars = fs.readdirSync(ENGINE_SEARCH_DIR).filter(file => file.endsWith(".jar"));
        if(jars.length != 1) {
            logger.warn(`Expected exactly 1 tank game jar but found: ${jars}`);
            return;
        }

        command = ["java", "-jar", path.join(ENGINE_SEARCH_DIR, jars[0])];
    }

    if(typeof command == "string") command = command.split(" ");

    return command;
})();


function determineEngineVersion(command) {
    const fileName = command
            .map(arg => ENGINE_NAME_EXPR.exec(arg))
            .filter(arg => arg);

    if(fileName.length !== 1) {
        throw new Error("Failed to detect engine version");
    }

    return fileName[0][1];
}


const COUNCIL_ACTIONS = ["bounty", "grant_life", "stimulus"];

function convertLogEntry(logEntry) {
    let subject = COUNCIL_ACTIONS.includes(logEntry.type) ? "Council" : logEntry.rawLogEntry.subject;

    return {
        ...logEntry.rawLogEntry,
        subject,
    };
}


// Put ids on the engines so we can differentiate them in logs
let uniqueIdCounter = 0;

class TankGameEngine {
    constructor(command, timeout) {
        if(!Array.isArray(command) || command.length <= 0) {
            throw new Error(`Expected an array in the form ["command", ...args] but got ${command}`);
        }

        this._id = `java-${++uniqueIdCounter}`;
        this._version = determineEngineVersion(command);
        this._comm = new JsonCommunicationChannel(command, timeout, this._id);

        // Hacky way to detect if we're using an engine from the main or stable branch
        this._isMainBranch = this._version != "0.0.2";
    }

    _runCommand(command, data) {
        if(!data) data = {};

        data["type"] = "command";
        data["command"] = command;

        return this._comm.sendRequestAndWait(data);
    }

    // Helper functions
    async shutdown() {
        try {
            await this._comm.sendRequestAndWait({
                "type": "command",
                "command": "exit",
            });

            logger.info({ msg: "Exited", id: this._id });
        }
        catch(err) {
            logger.warn({ msg: "Exit command failed", err, id: this._id });
            this._comm.kill();
        }
    }

    getGameStateFromEngineState(state) {
        if(this._isMainBranch) {
            return boardStateMain.gameStateFromRawState(state);
        }
        else {
            return boardStateStable.gameStateFromRawState(state);
        }
    }

    getEngineStateFromGameState(state, gameVersion) {
        if(this._isMainBranch) {
            return boardStateMain.gameStateToRawState(state, gameVersion);
        }
        else {
            return boardStateStable.gameStateToRawState(state);
        }
    }

    async getBoardState() {
        return await this._runCommand("display");
    }

    async getPossibleActions(player) {
        return (await this._comm.sendRequestAndWait({
            type: "possible_actions",
            player,
        })).actions;
    }

    setBoardState(state) {
        return this._comm.sendRequestAndWait({
            type: "state",
            ...state,
        });
    }

    async processAction(action) {
        await this._comm.sendRequestAndWait({
            type: "action",
            ...convertLogEntry(action),
        });

        return this.getBoardState();
    }

    async setGameVersion(version) {
        // TODO: Update version names
        if(!isNaN(version) && this._isMainBranch) version = `default-v${version}`;

        await this._comm.sendRequestAndWait({
            type: "version",
            version,
        });
    }

    getEngineSpecificSource(opts) {
        return new JavaEngineSource(opts);
    }

    async getLineOfSightFor(player) {
        const actions = await this.getPossibleActions(player);
        const shootAction = actions.find(action => action.rule == "shoot");
        if(!shootAction) {
            throw new Error("Failed to find shoot action");
        }

        const targets = shootAction.fields.find(field => field.name == "target");
        if(!targets) {
            throw new Error("Shoot action is missing the target parameter");
        }

        return targets.range;
    }

    getVersionInfo() {
        return `Java Engine v${this._version}`;
    }
}

export function createEngine(timeout = TANK_GAME_TIMEOUT) {
    return new TankGameEngine(TANK_GAME_ENGINE_COMMAND, timeout);
}

export function isEngineAvailable() {
    return TANK_GAME_ENGINE_COMMAND !== undefined;
}