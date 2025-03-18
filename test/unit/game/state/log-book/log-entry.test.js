import assert from "node:assert";
import { LogEntry } from "../../../../../src/game/state/log-book/log-entry.js";
import { Dice } from "../../../../../src/game/possible-actions/die.js";

function makeMockActionSet() {
    return [
        {
            getActionName: () => "bad-action",
        },
        {
            getActionName: () => "shoot",
            getDiceFor: () => {
                return [new Dice(3, { name: "hit die" })];
            }
        }
    ];
}


function makeBasicHitEntry(roll) {
    let hitEntry = new LogEntry({
        action: "shoot",
        subject: "Terence",
        target: "G5",
        hit_roll: {
            type: "die-roll",
            manual: true,
            roll,
        },
    });

    return {hitEntry};
}

describe("LogEntry", () => {
    it("can finalize the log entry", () => {
        let {hitEntry} = makeBasicHitEntry([true, false]);
        let actions = makeMockActionSet();
        hitEntry.finalizeEntry({
            gameState: { stateNo: 2 },
            actions,
        });

        // Hit field is unmodified for manual roll
        assert.deepEqual(hitEntry.rawLogEntry.hit_roll.roll, [true, false]);
    });
});
