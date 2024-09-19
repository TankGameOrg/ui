import { deserializer } from "../../deserialization.js";
import "./board/board.js";
import "./board/element.js";
import "./players/player.js";
import Players from "./players/players.js";

export class GameState {
    constructor(players, board, council) {
        this.players = new Players(players);
        this.board = board;
        this.council = council;
    }

    static deserialize(rawGameState) {
        return new GameState(
            rawGameState.players,
            rawGameState.board,
            rawGameState.council,
        );
    }

    serialize() {
        return {
            players: this.players.getAllPlayers(),
            board: this.board,
            council: this.council,
        };
    }

    modify({ players, board, council } = {}) {
        return new GameState(
            (players || this.players).getAllPlayers?.(),
            board || this.board,
            council || this.council);
    }

    getElementsByPlayer(player) {
        return this.board.getAllUnits()
            .filter(element => !!element.playerRef?.isFor?.(player));
    }
}

deserializer.registerDeserializer("game-state-v1", (rawState, helper) => {
    // helpers.updatedContent(); // TODO: Uncomment

    return GameState.deserialize({
        ...rawState,
        council: rawState.metaEntities.council,
        metaEntities: undefined,
    });
});

deserializer.registerClass("game-state-v2", GameState);