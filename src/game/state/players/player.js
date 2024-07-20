import { deepClone } from "../../../utils.js";

export default class Player {
    constructor(attributes = {}) {
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
        return new Player(deepClone(this.attributes));
    }
}