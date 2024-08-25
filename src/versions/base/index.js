import { PossibleActionSourceSet } from "../../game/possible-actions/index.js";
import { AttributeDescriptor, EntityDescriptor, FloorTileDescriptor } from "./descriptors.js";

export class GameVersion {
    constructor({ logFormatter, entityDescriptors, floorTileDescriptors, councilPlayerTypes, manualPath, actionFactory, attributeDescriptors, findCooldowns }) {
        this._logFormatter = logFormatter;
        this._entityDescriptors = entityDescriptors;
        this._floorTileDescriptors = floorTileDescriptors;
        this._councilPlayerTypes = councilPlayerTypes;
        this._manualPath = manualPath;
        this._actionFactory = actionFactory;
        this._attributeDescriptors = attributeDescriptors;
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

    getCouncilPlayerTypes() {
        return this._councilPlayerTypes || [];
    }

    getManual() {
        return this._manualPath;
    }

    getActionFactories(engine) {
        return new PossibleActionSourceSet(this._actionFactory(engine));
    }

    getAttributeDescriptor(name, attribute) {
        const Descriptor = this._attributeDescriptors[name] || AttributeDescriptor;
        return new Descriptor(name, attribute);
    }
}