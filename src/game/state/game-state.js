import { deserializer } from "../../deserialization.js";
import Board from "./board/board.js";
import Entity from "./board/entity.js";
import Players from "./players/players.js";

export class GameState {
    constructor(players, board, metaEntities) {
        this.players = new Players(players);
        this.board = board;
        this.metaEntities = metaEntities;
    }

    static legacyDeserialize(rawGameState) {
        let players = Players.legacyDeserialize(rawGameState.players);

        let metaEntities = {};
        for(const name of Object.keys(rawGameState.metaEntities)) {
            metaEntities[name] = Entity.legacyDeserialize(rawGameState.metaEntities[name], players);
        }

        return new GameState(
            players.getAllPlayers(),
            Board.legacyDeserialize(rawGameState.board, players),
            metaEntities,
        );
    }

    static deserialize(rawGameState) {
        return new GameState(
            rawGameState.players,
            rawGameState.board,
            rawGameState.metaEntities,
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
            players || this.players,
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