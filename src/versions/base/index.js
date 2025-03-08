import { LogEntryFormatter } from "./log-entry-formatter.js";

export class GameVersion {
    constructor({ logFormatter, manualPath, findCooldowns, getAnimationsForState } = {}) {
        this._logFormatter = logFormatter || new LogEntryFormatter();
        this._manualPath = manualPath;
        this.findCooldowns = findCooldowns || (() => []);
        this.getAnimationsForState = getAnimationsForState;
    }

    formatLogEntry(logEntry, gameState) {
        return this._logFormatter.format(logEntry, gameState, this);
    }

    getManual() {
        return this._manualPath;
    }
}