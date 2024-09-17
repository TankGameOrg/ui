/* globals process */
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import { logger } from "#platform/logging.js";
import { encodeGameState, decodeGameState } from "./board-state.js";
import { JavaEngineSource } from "./possible-action-source.js";
import { JsonCommunicationChannel } from "../json-communication-channel.js";
import { convertLogEntry } from "./log-translator.js";

const TANK_GAME_TIMEOUT = 3; // seconds

// Put ids on the engines so we can differentiate them in logs
let uniqueIdCounter = 0;

class TankGameApi {
    constructor(comm, ruleset, instanceName, shutdownCallback) {
        this._comm = comm;
        this._instance = instanceName;
        this._shutdownCallback = shutdownCallback;

        this._comm.sendRequestAndWait({
            method: "createInstance",
            instance: this._instance,
            ruleset,
        });
    }

    async shutdown() {
        await this._comm.sendRequestAndWait({
            "method": "destroyInstance",
            instance: this._instance,
        });

        logger.info({ msg: "Destroyed", instance: this._instance });
        this._shutdownCallback();
    }

    getGameStateFromEngineState(state) {
        return decodeGameState(state);
    }

    getEngineStateFromGameState(state, gameVersion) {
        return encodeGameState(state, gameVersion);
    }

    async getBoardState() {
        return (await this._comm.sendRequestAndWait({
            method: "getState",
            instance: this._instance,
        }));
    }

    async getPossibleActions(player) {
        return (await this._comm.sendRequestAndWait({
            method: "getPossibleActions",
            instance: this._instance,
            player,
        })).actions;
    }

    setBoardState(state) {
        return this._comm.sendRequestAndWait({
            method: "setState",
            instance: this._instance,
            ...state,
        });
    }

    async processAction(action) {
        await this._comm.sendRequestAndWait({
            method: "ingestAction",
            instance: this._instance,
            ...convertLogEntry(action),
        });

        return this.getBoardState();
    }

    async canProcessAction(action) {
        const result = await this._comm.sendRequestAndWait({
            method: "canIngestAction",
            instance: this._instance,
            ...convertLogEntry(action),
        });

        return result.errors;
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
        this._instances = new Set();
        this._engineCommand = engineCommand;
        this._collectVersionInfo();
    }

    _collectVersionInfo() {
        const proc = spawnSync(this._engineCommand[0], this._engineCommand.slice(1).concat(["--version"]));
        this._versionInfo = JSON.parse(proc.stdout.toString());
    }

    createEngine(ruleset) {
        if(!this._comm) {
            this._comm = new JsonCommunicationChannel(this._engineCommand, TANK_GAME_TIMEOUT, "java-engine");
        }

        const instanceName = `${ruleset}--${++uniqueIdCounter}`;
        this._instances.add(instanceName);
        return new TankGameApi(this._comm, ruleset, instanceName, () => {
            this._instances.delete(instanceName);

            if(this._instances.size === 0) {
                this._comm.sendRequestAndWait({
                    "method": "exit",
                });

                this._comm = undefined;
            }
        });
    }

    getEngineVersion() {
        return this._versionInfo.pretty_version;
    }

    getSupportedGameVersions() {
        return this._versionInfo.supported_rulesets;
    }
}