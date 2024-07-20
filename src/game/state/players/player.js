import { deepClone } from "../../../utils.js";

let idGenerator = 0;

export default class Player {
    constructor(attributes = {}, uniqueId) {
        this.uniqueId = uniqueId || (++idGenerator + "");
        this.attributes = attributes;
    }

    get name() { return this.attributes.name; }
    get type() { return this.attributes.type; }

    static deserialize(rawPlayer) {
        return new Player(rawPlayer);
    }

    serialize() {
        return this.attributes;
    }

    clone() {
        return new Player(deepClone(this.attributes), this.uniqueId);
    }

    asRef() {
        return new PlayerRef(this);
    }
}

export class PlayerRef {
    constructor(player) {
        this._playerId = player.uniqueId;
    }

    getPlayer(gameState) {
        return gameState.players.getPlayerById(this._playerId);
    }

    isFor(player) {
        return this._playerId == player.uniqueId;
    }
}