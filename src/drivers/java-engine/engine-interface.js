/* globals process */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import { logger } from "#platform/logging.js";
import { gameStateToRawState, gameStateFromRawState } from "./board-state.js";
import { JavaEngineSource } from "./possible-action-source.js";
import { JsonCommunicationChannel } from "../json-communication-channel.js";
import { convertLogEntry } from "./log-translator.js";

const TANK_GAME_TIMEOUT = 3; // seconds

// Put ids on the engines so we can differentiate them in logs
let uniqueIdCounter = 0;

class TankGameEngine {
    constructor(command, timeout) {
        if(!Array.isArray(command) || command.length <= 0) {
            throw new Error(`Expected an array in the form ["command", ...args] but got ${command}`);
        }

        this._id = `java-${++uniqueIdCounter}`;
        this._comm = new JsonCommunicationChannel(command, timeout, this._id);
    }

    async shutdown() {
        try {
            await this._comm.sendRequestAndWait({
                "method": "exit",
                instance: "default",
            });

            logger.info({ msg: "Exited", id: this._id });
        }
        catch(err) {
            logger.warn({ msg: "Exit command failed", err, id: this._id });
            this._comm.kill();
        }
    }

    getGameStateFromEngineState(state) {
        return gameStateFromRawState(state);
    }

    getEngineStateFromGameState(state, gameVersion) {
        return gameStateToRawState(state, gameVersion);
    }

    async getBoardState() {
        return (await this._comm.sendRequestAndWait({
            method: "getState",
            instance: "default",
        }));
    }

    async getPossibleActions(player) {
        return (await this._comm.sendRequestAndWait({
            method: "getPossibleActions",
            instance: "default",
            player,
        })).actions;
    }

    setBoardState(state) {
        return this._comm.sendRequestAndWait({
            method: "setState",
            instance: "default",
            ...state,
        });
    }

    async processAction(action) {
        await this._comm.sendRequestAndWait({
            method: "ingestAction",
            instance: "default",
            ...convertLogEntry(action),
        });

        return this.getBoardState();
    }

    async canProcessAction(action) {
        const result = await this._comm.sendRequestAndWait({
            method: "canIngestAction",
            instance: "default",
            ...convertLogEntry(action),
        });

        return result.errors;
    }

    async setGameVersion(ruleset) {
        await this._comm.sendRequestAndWait({
            method: "createInstance",
            instance: "default",
            ruleset,
        });
    }

    getEngineSpecificSource(opts) {
        return new JavaEngineSource(opts);
    }
}

export function getAllEngineFactories() {
    const ENGINE_SEARCH_DIR = process.env.TANK_GAME_ENGINE_SEARCH_DIR || "engine";

    return fs.readdirSync(ENGINE_SEARCH_DIR)
        .filter(file => file.endsWith(".jar"))
        .map(jar => ["java", "-jar", path.join(ENGINE_SEARCH_DIR, jar)])
        .map(command => new EngineFactory(command));
}

class EngineFactory {
    constructor(engineCommand) {
        this._engineCommand = engineCommand;
        this._collectVersionInfo();
    }

    _collectVersionInfo() {
        const proc = spawnSync(this._engineCommand[0], this._engineCommand.slice(1).concat(["--version"]));
        this._versionInfo = JSON.parse(proc.stdout.toString());
    }

    createEngine() {
        return new TankGameEngine(this._engineCommand, TANK_GAME_TIMEOUT);
    }

    getEngineVersion() {
        return this._versionInfo.pretty_version;
    }

    getSupportedGameVersions() {
        return this._versionInfo.supported_rulesets;
    }
}