import assert from "node:assert";
import Board from "../../../../src/game/state/board/board.js";
import Element from "../../../../src/game/state/board/element.js";
import { Position } from "../../../../src/game/state/board/position";
import { GameState } from "../../../../src/game/state/game-state.js";
import Player from "../../../../src/game/state/players/player.js";
import { Council } from "../../../../src/game/state/meta/council.js";

describe("GameState", () => {
    it("can find all entities owned by a player", () => {
        const players = [
            new Player({ name: "Ted" }),
            new Player({ name: "Bella" }),
        ];

        let board = new Board(2, 2);
        board.setUnit(new Element({ type: "tank", position: new Position("A1"), playerRef: players[0].asRef() /* Ted */ }));
        board.setUnit(new Element({ type: "tank", position: new Position("A2"), playerRef: players[1].asRef() /* Bella */ }));

        const gameState = new GameState({
            players,
            board,
            council: new Council({}),
        });

        assert.deepEqual(
            gameState.getElementsByPlayer(gameState.players.getPlayerByName("Ted")),
            [
                board.getUnitAt(new Position("A1")),
            ],
        );

        assert.deepEqual(
            gameState.getElementsByPlayer(gameState.players.getPlayerByName("Bella")),
            [
                board.getUnitAt(new Position("A2")),
            ],
        );
    });
});
