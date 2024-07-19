import { diffAttributes } from "../diff-utils.js";

export default class Player {
    constructor(attributes = {}) {
        this.entities = [];
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

    /**
     * Find the differences between two players
     *
     * Attibutes and other objects that exist in this player but not other player are considered remove and the reverse are considered added.
     * @param {*} otherPlayers the of player to compare to
     */
    difference(otherPlayers) {
        const source = new PlayerSource(this.name);
        return diffAttributes(source, this.attributes, otherPlayers.attributes);
    }
}

export class PlayerSource {
    /**
     * Construct the source for a player
     * @param {*} playerName the name of the player
     */
    constructor(playerName) {
        this.playerName = playerName;
    }

    /**
     * Check if a source matches this player source
     * @param {*} playerName
     * @param {*} source
     * @returns
     */
    static is(playerName, source) {
        return source instanceof PlayerSource && source.playerName == playerName;
    }
}