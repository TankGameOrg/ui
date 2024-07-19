import Board from "./board/board.js";
import Entity from "./board/entity.js";
import { Difference, diffKeys, NamedSource } from "./diff-utils.js";
import Players from "./players/players.js";

export class GameState {
    constructor(players, board, metaEntities) {
        this.players = players;
        this.board = board;
        this.metaEntities = metaEntities;
    }

    static deserialize(rawGameState) {
        let players = Players.deserialize(rawGameState.players);

        let metaEntities = {};
        for(const name of Object.keys(rawGameState.metaEntities)) {
            metaEntities[name] = Entity.deserialize(rawGameState.metaEntities[name], players);
        }

        return new GameState(
            players,
            Board.deserialize(rawGameState.board, players),
            metaEntities,
        );
    }

    serialize() {
        let metaEntities = {};
        for(const entityName of Object.keys(this.metaEntities)) {
            metaEntities[entityName] = this.metaEntities[entityName].serialize();
        }

        let raw = {
            players: this.players.serialize(),
            board: this.board.serialize(),
            metaEntities,
        };

        return raw;
    }

    /**
     * Find the differences between this game state and another
     *
     * Attibutes and other objects that exist in this state but not other state are considered added and the reverse are considered removed.
     * @param {GameState} otherState the game state to compare to
     */
    difference(otherState) {
        let differences = this.players.difference(otherState.players);
        differences = differences.concat(this.board.difference(otherState.board));

        differences = differences.concat(diffKeys({
            fromKeys: Object.keys(this.metaEntities),
            toKeys: Object.keys(otherState.metaEntities),
            onAdd: name => {
                return [new Difference({
                    source: new NamedSource("meta-entities"),
                    key: name,
                    changeType: "added",
                    payload: this.metaEntities[name],
                })];
            },
            onRemove: name => {
                return [new Difference({
                    source: new NamedSource("meta-entities"),
                    key: name,
                    changeType: "removed",
                })];
            },
            onElse: name => this.metaEntities[name].difference(otherState.metaEntities[name]),
        }));

        return differences;
    }
}