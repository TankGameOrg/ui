import Board from "./board/board.js";
import Entity from "./board/entity.js";
import Players from "./players/players.js";

export class GameState {
    constructor(players, board, metaEntities, running = true, winner = "") {
        this.players = players;
        this.board = board;
        this.metaEntities = metaEntities;
        this.winner = winner?.length > 0 ? winner : undefined;
    }

    get running() {
        return this.winner === undefined;
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
            rawGameState.running,
            rawGameState.winner,
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

        if(this.winner !== undefined) {
            raw.winner = this.winner;
        }

        return raw;
    }
}