import { deserializer } from "../../../deserialization.js";
import { Council } from "../meta/council.js";

/**
 * An entity which could be on the board, a floor tile, or a meta entity (i.e. council)
 */
export default class Entity {
    /**
     * Construct an entity
     * @param {*} type The type of the entity
     * @param {*} attributes The attributes of the entity
     * @param {*} players The players or PlayerRefs that control this entity
     */
    constructor({ type, attributes = {} }) {
        this.type = type;
        this.attributes = attributes;
    }

    /**
     * Get the PlayerRefs for all of the players that control this entity
     * @returns
     */
    getPlayerRefs() {
        return this.attributes.playerRef !== undefined ? [this.attributes.playerRef] : [];
    }

    /**
     * Clone this entity (PlayerRefs are shallow copied)
     * @param {*} removePlayers Don't copy players to the cloned entity
     * @returns
     */
    clone({ removePlayers = false } = {}) {
        return new Entity({
            type: this.type,
            attributes: Object.assign({
                playerRef: removePlayers ? undefined : this.attributes.playerRef,
            }, this.attributes),
        });
    }

    /**
     * Load an entity from a json serialized object
     * @param {*} rawEntity the json serialized object to load
     * @returns
     */
    static deserialize(rawEntity) {
        let attributes = Object.assign({}, rawEntity);
        delete attributes.type;

        if(attributes.playerRef === undefined) {
            delete attributes.playerRef;
        }

        return new Entity({
            type: rawEntity.type,
            attributes,
        });
    }

    /**
     * Serialize this entity to a json object
     * @returns
     */
    serialize() {
        return {
            ...this.attributes,
            type: this.type,
        };
    }
}

deserializer.registerClass("entity-v2", Entity);

// Mappings from the legacy type names to the new ones
const TYPE_MAPPINGS = {
    tank: "Tank",
    wall: "Wall",
    gold_mine: "GoldMine",
    health_pool: "HealthPool",
    destructible_floor: "DestructibleFloor",
    unwalkable_floor: "UnwalkableFloor",
};

deserializer.registerDeserializer("entity", (rawEntity, helpers) => {
    // helpers.updatedContent(); // TODO: Uncomment

    rawEntity.type = TYPE_MAPPINGS[rawEntity.type] || rawEntity.type;

    if(rawEntity.type == "Tank") {
        rawEntity.dead = rawEntity.durability !== undefined;

        for(const removedAttibute of ["actions", "range", "bounty"]) {
            if(rawEntity[removedAttibute] === undefined) {
                rawEntity[removedAttibute] = 0;
            }
        }

        if(rawEntity.durability === undefined) {
            rawEntity.durability = rawEntity.health;
            delete rawEntity.health;
        }
    }

    if(rawEntity.type == "council") {
        const playerTypes = helpers.getPlayerTypes();

        let councilAttrs = {
            coffer: rawEntity.coffer,
            councilors: (rawEntity.players || []).filter(ref => playerTypes[ref._playerId] == "councilor"),
            senators: (rawEntity.players || []).filter(ref => playerTypes[ref._playerId] == "senator"),
        };

        if(rawEntity.armistice !== undefined) {
            councilAttrs.armistice = rawEntity.armistice;
        }

        return new Council(councilAttrs);
    }

    if(rawEntity.players) {
        rawEntity.playerRef = rawEntity.players[0];
    }

    if(Object.prototype.hasOwnProperty.call(rawEntity, "players")) {
        delete rawEntity.players;
    }

    return Entity.deserialize(rawEntity);
});