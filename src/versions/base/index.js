import { AttributeDescriptor, UnitDescriptor, FloorTileDescriptor } from "./descriptors.js";
import { LogEntryFormatter } from "./log-entry-formatter.js";

export class GameVersion {
    constructor({ logFormatter, unitDescriptors, floorTileDescriptors, manualPath, attributeDescriptors, findCooldowns, addAnimationData } = {}) {
        this._logFormatter = logFormatter || new LogEntryFormatter();
        this._unitDescriptors = unitDescriptors || {};
        this._floorTileDescriptors = floorTileDescriptors || {};
        this._manualPath = manualPath;
        this._attributeDescriptors = attributeDescriptors || {};
        this.findCooldowns = findCooldowns || (() => []);
        this.addAnimationData = addAnimationData;
    }

    formatLogEntry(logEntry, gameState) {
        return this._logFormatter.format(logEntry, gameState, this);
    }

    getUnitDescriptor(unit, gameState) {
        const Descriptor = this._unitDescriptors[unit.type] || UnitDescriptor;
        return new Descriptor(unit, gameState);
    }

    getFloorTileDescriptor(floorTile) {
        const Descriptor = this._floorTileDescriptors[floorTile.type] || FloorTileDescriptor;
        return new Descriptor(floorTile);
    }

    getManual() {
        return this._manualPath;
    }

    getAttributeDescriptor(name, attribute) {
        const Descriptor = this._attributeDescriptors[name] || AttributeDescriptor;
        return new Descriptor(name, attribute);
    }
}