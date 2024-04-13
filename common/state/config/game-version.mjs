import { LogEntryFormatter } from "./log-entry-formatter.mjs";

export class GameVersionConfig {
    constructor(gameVersionConfig) {
        this._gameVersionConfig = gameVersionConfig;
    }

    getLogEntryFormatter(logEntryType) {
        const formatters = this._gameVersionConfig?.logEntryFormatters;
        if(!formatters || !formatters[logEntryType]) return;

        return new LogEntryFormatter(formatters[logEntryType]);
    }
}