import Player from "../../../../../src/game/state/players/player.js";
import assert from "node:assert";
import Players from "../../../../../src/game/state/players/players.js";

const ty = new Player({ name: "Ty" });
const corey = new Player({ name: "Corey" });
const ryan = new Player({ name: "Ryan" });
const lena = new Player({ name: "Lena" });
const xavion = new Player({ name: "Xavion" });
const players = new Players([ty, ryan, corey, lena, xavion]);
const players2 = new Players([ty, lena, xavion]);


describe("Board", () => {
    describe("Players", () => {
        it("can find players by name", () => {
            assert.deepEqual(players.getPlayerByName("Xavion"), xavion);
            assert.deepEqual(players.getPlayerByName("Ty"), ty);
            assert.deepEqual(players.getPlayerByName("Dan"), undefined);
        });

        it("can list all players", () => {
            assert.deepEqual(players.getAllPlayers(), [ty, ryan, corey, lena, xavion]);
            assert.deepEqual(players2.getAllPlayers(), [ty, lena, xavion]);
        });
    });
});