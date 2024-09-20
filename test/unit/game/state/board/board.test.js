import assert from "node:assert";
import Board from "../../../../../src/game/state/board/board.js";
import Element from "../../../../../src/game/state/board/element.js";
import { Position } from "../../../../../src/game/state/board/position.js";
import Player from "../../../../../src/game/state/players/player.js";

let board = new Board(7, 5);

const tank1 = new Element({ type: "tank", position: new Position("A1") });
const destroyedTank = new Element({ type: "dead-tank", position: new Position("C4") });
let josh = new Player({ name: "Josh", type: "tank" });
let tank2 = new Element({ type: "tank", position: new Position("G5"), playerRef: josh.asRef() });
const baloon = new Element({ type: "baloon", position: new Position("B2") });

board.setUnit(tank1);
board.setUnit(destroyedTank);
board.setUnit(tank2);
board.setUnit(baloon);

const goldMine1 = new Element({ type: "gold_mine", position: new Position("E5") });
const goldMine2 = new Element({ type: "gold_mine", position: new Position("B4") });
const base = new Element({ type: "base", position: new Position("C4") });
board.setFloorTile(goldMine1);
board.setFloorTile(goldMine2);
board.setFloorTile(base);

const empty = new Element({ type: "empty", position: new Position("D3") });
const emptyTile = new Element({ type: "empty", position: new Position("G5") });


describe("Board", () => {
    it("can find the unit at a space", () => {
        assert.deepEqual(board.getUnitAt(new Position("A1")), tank1);
        assert.deepEqual(board.getUnitAt(new Position("C4")), destroyedTank);
        assert.deepEqual(board.getUnitAt(new Position("D3")), empty);
    });

    it("can find the floor tile at a space", () => {
        assert.deepEqual(board.getFloorTileAt(new Position("B4")), goldMine2);
        assert.deepEqual(board.getFloorTileAt(new Position("C4")), base);
        assert.deepEqual(board.getFloorTileAt(new Position("G5")), emptyTile);
    });

    it("can be serialize and deserialized", () => {
        let players = [josh];
        const reSerializedBoard = Board.deserialize(board.serialize({players}), players);
        assert.deepEqual(reSerializedBoard, board);
    });

    it("can check if a position is in bounds", () => {
        assert.ok(!board.isInBounds(new Position(7, 5)));
        assert.ok(!board.isInBounds(new Position(7, 0)));
        assert.ok(!board.isInBounds(new Position(0, 5)));
        assert.ok(!board.isInBounds(new Position(50, 50)));
    });
});