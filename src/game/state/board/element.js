import { deserializer } from "../../../deserialization.js";
import { Council } from "../meta/council.js";

/**
 * An element which could be on the board, a floor tile, or a meta element (i.e. council)
 */
export default class Element {
    /**
     * Construct an element
     * @param {*} attributes The attributes of the element
     */
    constructor(attributes = {}) {
        Object.assign(this, attributes);
    }

    /**
     * Clone this element (PlayerRefs are shallow copied)
     * @param {*} removePlayers Don't copy players to the cloned element
     * @returns
     */
    clone({ removePlayers = false } = {}) {
        return new Element({
            ...this,
            playerRef: removePlayers ? undefined : this.playerRef,
        });
    }

    /**
     * Load an element from a json serialized object
     * @param {*} rawElement the json serialized object to load
     * @returns
     */
    static deserialize(rawElement) {
        let attributes = Object.assign({}, rawElement);

        if(attributes.playerRef === undefined) {
            delete attributes.playerRef;
        }

        return new Element(attributes);
    }

    /**
     * Serialize this element to a json object
     * @returns
     */
    serialize() {
        return this;
    }
}

deserializer.registerClass("element-v1", Element);

// Mappings from the legacy type names to the new ones
const TYPE_MAPPINGS = {
    tank: "Tank",
    wall: "Wall",
    gold_mine: "GoldMine",
    health_pool: "HealthPool",
    destructible_floor: "DestructibleFloor",
    unwalkable_floor: "UnwalkableFloor",
};

deserializer.registerDeserializer("entity", (rawElement, helpers) => {
    helpers.updatedContent();

    rawElement.type = TYPE_MAPPINGS[rawElement.type] || rawElement.type;

    if(rawElement.type == "Tank") {
        rawElement.dead = rawElement.durability !== undefined;

        for(const removedAttibute of ["actions", "range", "bounty"]) {
            if(rawElement[removedAttibute] === undefined) {
                rawElement[removedAttibute] = 0;
            }
        }

        if(rawElement.durability === undefined) {
            rawElement.durability = rawElement.health;
            delete rawElement.health;
        }
    }

    if(rawElement.type == "council") {
        const playerTypes = helpers.getPlayerTypes();

        let councilAttrs = {
            coffer: rawElement.coffer,
            councillors: (rawElement.players || []).filter(ref => playerTypes[ref._playerName] == "councilor"),
            senators: (rawElement.players || []).filter(ref => playerTypes[ref._playerName] == "senator"),
        };

        if(rawElement.armistice !== undefined) {
            councilAttrs.armistice = rawElement.armistice;
        }

        return new Council(councilAttrs);
    }

    if(rawElement.players) {
        rawElement.playerRef = rawElement.players[0];
    }

    if(Object.prototype.hasOwnProperty.call(rawElement, "players")) {
        delete rawElement.players;
    }

    return Element.deserialize(rawElement);
});