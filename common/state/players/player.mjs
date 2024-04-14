import { Position } from "../board/position.mjs";
import { ResourceHolder } from "../resource.mjs";

export default class Player {
    constructor(name, type, entities) {
        this.name = name;
        this.type = type;
        this.entities = entities;

        for(let entity of entities) {
            entity.player = this;
        }
    }

    static deserialize(rawPlayer, board) {
        const entities = rawPlayer.entities.map(entityPos =>
            board.getEntityAt(Position.fromHumanReadable(entityPos)));

        return new Player(rawPlayer.name, rawPlayer.type, entities);
    }

    serialize() {
        return {
            name: this.name,
            type: this.type,
            entities: this.entities.map(entity => entity.position.humanReadable)
        };
    }

    getControlledResources() {
        let controlledResources = new ResourceHolder();
        for(const entity of this.entities) {
            Object.assign(controlledResources, entity.resources);
        }

        return controlledResources;
    }
}