import assert from "node:assert";
import Board from "../../../../src/game/state/board/board.js";
import Entity from "../../../../src/game/state/board/entity.js";
import { Position } from "../../../../src/game/state/board/position";
import { GameState } from "../../../../src/game/state/game-state.js";
import Player from "../../../../src/game/state/players/player.js";

describe("GameState", () => {
    it("can find all entities owned by a player", () => {
        const players = [
            new Player({ name: "Ted" }),
            new Player({ name: "Bella" }),
        ];

        let board = new Board(2, 2);
        board.setEntity(new Entity({ type: "tank", position: new Position("A1"), playerRef: players[0].asRef() /* Ted */ }));
        board.setEntity(new Entity({ type: "tank", position: new Position("A2"), playerRef: players[1].asRef() /* Bella */ }));

        const gameState = new GameState(
            players,
            board,
            {
                council: new Entity({ type: "council", playerRef: players[0].asRef() /* Ted */, }),
            },
        );

        assert.deepEqual(
            gameState.getEntitiesByPlayer(gameState.players.getPlayerByName("Ted")),
            [
                gameState.metaEntities.council,
                board.getEntityAt(new Position("A1")),
            ],
        );

        assert.deepEqual(
            gameState.getEntitiesByPlayer(gameState.players.getPlayerByName("Bella")),
            [
                board.getEntityAt(new Position("A2")),
            ],
        );
    });
});
