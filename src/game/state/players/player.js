import { deserializer } from "../../../deserialization.js";
import { deepClone } from "../../../utils.js";

/**
 * An instance of a player/user
 */
export default class Player {
    /**
     * Construct a player
     * @param {*} attributes The player's attributes
     */
    constructor(attributes = {}) {
        Object.assign(this, attributes);
    }

    /**
     * Construct a player from a json serialized object
     * @param {*} rawPlayer
     * @returns
     */
    static deserialize(rawPlayer) {
        return new Player(rawPlayer);
    }

    /**
     * Serialize a player to a json object
     * @returns
     */
    serialize() {
        return this;
    }

    /**
     * Duplicate this player
     * @returns
     */
    clone() {
        return new Player(deepClone(this));
    }

    /**
     * Get a PlayerRef for this player
     * @returns
     */
    asRef() {
        return new PlayerRef(this);
    }
}

deserializer.registerDeserializer("player-v1", function(rawPlayer, helpers) {
    // helpers.updatedContent(); // TODO: Uncomment

    return Player.deserialize({
        ...rawPlayer.attributes,
        type: undefined,
    })
});

deserializer.registerClass("player-v2", Player);

/**
 * A handle to a player
 */
export class PlayerRef {
    constructor(player) {
        this._playerName = player.name;
    }

    static deserialize(rawPlayerRef) {
        return new PlayerRef(rawPlayerRef);
    }

    serialize() {
        return {
            name: this._playerName,
        };
    }

    /**
     * Get the player referenced by this handle
     * @param {*} gameState the game state to get the player from
     * @returns
     */
    getPlayer(gameState) {
        return gameState.players.getPlayerByName(this._playerName);
    }

    /**
     * Check if a handle refers to a given player
     * @param {*} player
     * @returns
     */
    isFor(player) {
        return this._playerName == player.name;
    }
}

deserializer.registerDeserializer("player-ref-v1", (rawPlayerRef, helpers) => {
    // helpers.updatedContent(); // TODO: Uncomment
    rawPlayerRef.name = helpers.getPlayerNameById(rawPlayerRef.playerId);

    return PlayerRef.deserialize(rawPlayerRef);
});

deserializer.registerClass("player-ref-v2", PlayerRef);
