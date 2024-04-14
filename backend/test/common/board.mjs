import assert from "node:assert";
import Board from "../../../common/state/board/board.mjs";
import Entity from "../../../common/state/board/entity.mjs";
import { Position } from "../../../common/state/board/position.mjs";
import { ResourceHolder } from "../../../common/state/resource.mjs";
import { FloorTile } from "../../../common/state/board/floor-tile.mjs";

let board = new Board(7, 5);

const tank1 = new Entity("tank", new Position(0, 0), new ResourceHolder());
const destroyedTank = new Entity("destroyed-tank", new Position(2, 3), new ResourceHolder());
const tank2 = new Entity("tank", new Position(6, 4), new ResourceHolder());
const baloon = new Entity("baloon", new Position(1, 1), new ResourceHolder());

board.setEntity(tank1);
board.setEntity(destroyedTank);
board.setEntity(tank2);
board.setEntity(baloon);

const goldMine1 = new FloorTile("gold_mine", new Position(4, 4));
const goldMine2 = new FloorTile("gold_mine", new Position(1, 3));
const base = new FloorTile("base", new Position(2, 3));
board.setFloorTile(goldMine1);
board.setFloorTile(goldMine2);
board.setFloorTile(base);

const empty = new Entity("empty", new Position(3, 2), new ResourceHolder());
const emptyTile = new FloorTile("empty", new Position(6, 4));


describe("Board", () => {
    it("can find the entity at a space", () => {
        assert.deepEqual(board.getEntityAt(new Position(0, 0)), tank1);
        assert.deepEqual(board.getEntityAt(new Position(2, 3)), destroyedTank);
        assert.deepEqual(board.getEntityAt(new Position(3, 2)), empty);
    });

    it("can find the floor tile at a space", () => {
        assert.deepEqual(board.getFloorTileAt(new Position(1, 3)), goldMine2);
        assert.deepEqual(board.getFloorTileAt(new Position(2, 3)), base);
        assert.deepEqual(board.getFloorTileAt(new Position(6, 4)), emptyTile);
    });

    it("can find all entities of a given type", () => {
        assert.deepEqual(board.getEntitiesOfType(["tank"]), [tank1, tank2]);
        assert.deepEqual(board.getEntitiesOfType(["destroyed-tank"]), [destroyedTank]);
        assert.deepEqual(board.getEntitiesOfType(["tank", "baloon"]), [tank1, baloon, tank2]);
        assert.equal(board.getEntitiesOfType(["any"]).length, board.width * board.height);
    });

    it("can be serialize and deserialized", () => {
        const reSerializedBoard = Board.deserialize(board.serialize());
        assert.deepEqual(reSerializedBoard, board);
    });
});