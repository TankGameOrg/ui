import assert from "node:assert";
import Board from "../../../../../src/game/state/board/board.js";
import Entity from "../../../../../src/game/state/board/entity.js";
import { Position } from "../../../../../src/game/state/board/position.js";

let board = new Board(7, 5);

const tank1 = new Entity("tank", { position: new Position("A1") });
const destroyedTank = new Entity("dead-tank", { position: new Position("C4") });
const tank2 = new Entity("tank", { position: new Position("G5") });
const baloon = new Entity("baloon", { position: new Position("B2") });

board.setEntity(tank1);
board.setEntity(destroyedTank);
board.setEntity(tank2);
board.setEntity(baloon);

const goldMine1 = new Entity("gold_mine", { position: new Position("E5") });
const goldMine2 = new Entity("gold_mine", { position: new Position("B4") });
const base = new Entity("base", { position: new Position("C4") });
board.setFloorTile(goldMine1);
board.setFloorTile(goldMine2);
board.setFloorTile(base);

const empty = new Entity("empty", { position: new Position("D3") });
const emptyTile = new Entity("empty", { position: new Position("G5") });


describe("Board", () => {
    it("can find the entity at a space", () => {
        assert.deepEqual(board.getEntityAt(new Position("A1")), tank1);
        assert.deepEqual(board.getEntityAt(new Position("C4")), destroyedTank);
        assert.deepEqual(board.getEntityAt(new Position("D3")), empty);
    });

    it("can find the floor tile at a space", () => {
        assert.deepEqual(board.getFloorTileAt(new Position("B4")), goldMine2);
        assert.deepEqual(board.getFloorTileAt(new Position("C4")), base);
        assert.deepEqual(board.getFloorTileAt(new Position("G5")), emptyTile);
    });

    it("can be serialize and deserialized", () => {
        const reSerializedBoard = Board.deserialize(board.serialize());
        assert.deepEqual(reSerializedBoard, board);
    });

    it("can check if a position is in bounds", () => {
        assert.ok(!board.isInBounds(new Position(7, 5)));
        assert.ok(!board.isInBounds(new Position(7, 0)));
        assert.ok(!board.isInBounds(new Position(0, 5)));
        assert.ok(!board.isInBounds(new Position(50, 50)));
    });
});