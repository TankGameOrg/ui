import Player from "./player.js";

export default class Players {
    constructor(players) {
        this._playersById = {};
        this._playersByName = {};
        this._playersByType = {};

        for(const player of players) {
            this._playersById[player.uniqueId] = player;
            this._playersByName[player.name] = player;

            if(player.type !== undefined) {
                if(!this._playersByType[player.type]) {
                    this._playersByType[player.type] = [];
                }

                this._playersByType[player.type].push(player);
            }
        }
    }

    static deserialize(rawPlayers) {
        return new Players(
            rawPlayers.map(rawPlayer => Player.deserialize(rawPlayer))
        );
    }

    serialize() {
        return this.getAllPlayers()
            .map(player => player.serialize());
    }

    getAllPlayers() {
        return Object.values(this._playersByName);
    }

    getAllPlayerTypes() {
        return Object.keys(this._playersByType);
    }

    getPlayerById(uniqueId) {
        return this._playersById[uniqueId];
    }

    getPlayerByName(name) {
        return this._playersByName[name];
    }

    getPlayersByType(userType) {
        return this._playersByType[userType] || [];
    }
}