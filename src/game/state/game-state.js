import { deserializer } from "../../deserialization.js";
import "./board/board.js";
import "./board/entity.js";
import "./players/player.js";
import Players from "./players/players.js";

export class GameState {
    constructor(players, board, metaEntities) {
        this.players = new Players(players);
        this.board = board;
        this.metaEntities = metaEntities;
    }

    static deserialize(rawGameState, deserialize) {
        return new GameState(
            deserialize(rawGameState.players, "players"),
            deserialize(rawGameState.board, "board"),
            deserialize(rawGameState.metaEntities, "metaEntities"),
        );
    }

    serialize() {
        return {
            players: this.players.getAllPlayers(),
            board: this.board,
            metaEntities: this.metaEntities,
        };
    }

    modify({ players, board, metaEntities } = {}) {
        return new GameState(
            (players || this.players).getAllPlayers?.(),
            board || this.board,
            metaEntities || this.metaEntities);
    }

    _getAllEntities() {
        let allEntities = Object.values(this.metaEntities);
        allEntities = allEntities.concat(this.board.getAllEntities());
        return allEntities;
    }

    getEntitiesByPlayer(player) {
        return this._getAllEntities()
            .filter(entity => {
                return !!entity.getPlayerRefs().find(playerRef => playerRef.isFor(player));
            });
    }
}

deserializer.registerClass("game-state-v1", GameState);