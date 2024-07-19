import { diffAttributes, Difference, NamedSource } from "../diff-utils.js";
import { Position } from "./position.js";

export default class Entity {
    constructor({ type, position, attributes = {}, players = [] }) {
        this.type = type;
        this.position = position;
        this.players = [];
        this.attributes = attributes;

        for(let player of players) this.addPlayer(player);
    }

    addPlayer(player) {
        player.entities.push(this);
        this.players.push(player);
    }

    static deserialize(rawEntity, players) {
        let attributes = Object.assign({}, rawEntity);
        delete attributes.type;
        delete attributes.players;

        let position;
        if(attributes.position !== undefined) {
            position = new Position(attributes.position);
        }

        delete attributes.position;

        const myPlayers = (rawEntity.players || [])
            .map(playerName => players.getPlayerByName(playerName));
        return new Entity({ type: rawEntity.type, attributes, players: myPlayers, position });
    }

    serialize() {
        return {
            ...this.attributes,
            type: this.type,
            position: this.position?.humanReadable,
            players: this.players.length === 0 ?
                undefined : // Don't include a players field if it's empty
                this.players.map(player => player.name),
        };
    }

    /**
     * Find the differences between two entities
     *
     * Attibutes and other objects that exist in this entity set but not other entity set are considered remove and the reverse are considered added.
     * @param {*} otherEntity the entity to compare to
     * @param {*} source the source to attach to the differences generated
     */
    difference(otherEntity, source) {
        let differences = diffAttributes(source, this.attributes, otherEntity.attributes);

        const thisPlayers = new Set(this.players.map(player => player.name));
        const otherPlayers = new Set(otherEntity.players.map(player => player.name));

        for(const playerName of thisPlayers) {
            if(otherPlayers.has(playerName)) {
                // No difference.  Remove player so that the only players left in otherPlayers are the ones not in thisPlayers.
                otherPlayers.delete(playerName);
            }
            else {
                differences.push(new Difference({
                    source,
                    key: "player",
                    changeType: "removed",
                    payload: playerName,
                }));
            }
        }

        for(const playerName of otherPlayers) {
            differences.push(new Difference({
                source,
                key: "player",
                changeType: "added",
                payload: playerName,
            }));
        }

        return differences;
    }

    /**
     * Get a string that uniquely identifies this entity or undefined if a unique id is unavailable
     */
    getUniqueId() {
        if(this.players.length === 0) return;

        return this.players.map(player => player.name).join("-");
    }
}