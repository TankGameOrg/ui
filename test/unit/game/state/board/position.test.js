import assert from "node:assert";
import { Position } from "../../../../../src/game/state/board/position.js";

describe("Position", () => {
    it("can construct multiple types of positions", () => {
        const basic = new Position(2, 5);
        const letter = new Position("C6");
        const xy = new Position({ x: 2, y: 5 });
        assert.deepEqual(basic, letter);
        assert.deepEqual(letter, xy);
    });

    it("can encode xy coordinates as letters", () => {
        assert.equal(new Position(0, 0).humanReadable, "A1");
        assert.equal(new Position(13, 18).humanReadable, "N19");
        assert.equal(new Position(25, 29).humanReadable, "Z30");
        assert.equal(new Position(26, 29).humanReadable, "AA30");
        assert.equal(new Position(27, 29).humanReadable, "AB30");
        assert.equal(new Position(26 * 2, 50).humanReadable, "BA51");
    });

    it("can decode xy coordinates as letters", () => {
        assert.deepEqual(new Position("A1"), { x: 0, y: 0 });
        assert.deepEqual(new Position("N19"), { x: 13, y: 18 });
        assert.deepEqual(new Position("Z30"), { x: 25, y: 29 });
        assert.deepEqual(new Position("AA30"), { x: 26, y: 29 });
        assert.deepEqual(new Position("AB30"), { x: 27, y: 29 });
        assert.deepEqual(new Position("BA51"), { x: 26 * 2, y: 50 });
    });

    it("can find the distance between two positions", () => {
        assert.equal(new Position(0, 0).distanceTo(new Position(2, 2)), 2);
        assert.equal(new Position(0, 0).distanceTo(new Position(1, 2)), 2);
        assert.equal(new Position(0, 0).distanceTo(new Position(1, 0)), 1);
        assert.equal(new Position(0, 0).distanceTo(new Position(0, 0)), 0);
        assert.equal(new Position(2, 0).distanceTo(new Position(0, 0)), 2);
    });
});