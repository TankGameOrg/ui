import { deepClone } from "../../../utils.js";
import { Position } from "./position.js";

export default class Entity {
    constructor({ type, position, attributes = {}, players = [] }) {
        this.type = type;
        this.position = position;
        this._playerRefs = [];
        this.attributes = attributes;
        for(const player of players) {
            this.addPlayer(player);
        }
    }

    addPlayer(player) {
        this._playerRefs.push(player.asRef !== undefined ? player.asRef() : undefined);
    }

    getPlayerRefs() {
        return this._playerRefs;
    }

    clone({ removePlayers = false } = {}) {
        return new Entity({
            type: this.type,
            position: this.position,
            players: removePlayers ? [] : this._playerRefs.slice(0),
            attributes: deepClone(this.attributes),
        });
    }

    static deserialize(rawEntity, players) {
        let attributes = deepClone(rawEntity);
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

    serialize(gameState) {
        return {
            ...this.attributes,
            type: this.type,
            position: this.position?.humanReadable,
            players: this._playerRefs.length === 0 ?
                undefined : // Don't include a players field if it's empty
                this._playerRefs.map(player => player.getPlayer(gameState).name),
        };
    }
}