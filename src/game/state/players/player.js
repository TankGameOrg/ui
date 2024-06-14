import { Position } from "../board/position.js";
import { AttributeHolder } from "../attribute.js";

export default class Player {
    constructor(name, type, entities) {
        this.name = name;
        this.type = type;
        this.entities = [];

        for(let entity of entities) {
            this.adopt(entity);
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

    adopt(entity) {
        this.entities.push(entity);
        entity.players.push(this);
    }
}