import { AttributeDescriptor, EntityDescriptor, FloorTileDescriptor } from "./descriptors.js";
import { LogEntryFormatter } from "./log-entry-formatter.js";

export class GameVersion {
    constructor({ logFormatter, entityDescriptors, floorTileDescriptors, manualPath, attributeDescriptors, findCooldowns } = {}) {
        this._logFormatter = logFormatter || new LogEntryFormatter();
        this._entityDescriptors = entityDescriptors || {};
        this._floorTileDescriptors = floorTileDescriptors || {};
        this._manualPath = manualPath;
        this._attributeDescriptors = attributeDescriptors || {};
        this.findCooldowns = findCooldowns || (() => []);
    }

    formatLogEntry(logEntry, gameState) {
        return this._logFormatter.format(logEntry, gameState, this);
    }

    getEntityDescriptor(entity, gameState) {
        const Descriptor = this._entityDescriptors[entity.type] || EntityDescriptor;
        return new Descriptor(entity, gameState);
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