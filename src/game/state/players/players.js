/**
 * A searchable collection of players
 */
export default class Players {
    constructor(players) {
        this._playersById = {};
        this._playersByName = {};

        for(const player of players) {
            this._playersById[player.uniqueId] = player;
            this._playersByName[player.name] = player;
        }
    }

    /**
     * Get an array of all the players
     * @returns
     */
    getAllPlayers() {
        return Object.values(this._playersByName);
    }

    /**
     * Look up a player by it's unique ID
     * @param {*} uniqueId
     * @returns
     */
    getPlayerById(uniqueId) {
        return this._playersById[uniqueId];
    }

    /**
     * Look up a player by it's name
     * @param {*} name
     * @returns
     */
    getPlayerByName(name) {
        return this._playersByName[name];
    }
}