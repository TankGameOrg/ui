import assert from "node:assert";
import { GenericPossibleAction } from "../../../../src/game/possible-actions/generic-possible-action.js";
import { LogFieldSpec } from "../../../../src/game/possible-actions/log-field-spec.js";

const possibleAction = new GenericPossibleAction({
    subject: "John",
    actionName: "buy_action",
    fieldSpecs: [
        new LogFieldSpec({ logEntryField: "foo", type: "input" }),
        new LogFieldSpec({ logEntryField: "bar", type: "input" }),
    ]
});

describe("GenericPossibleAction", () => {
    it("can validate that all fields have been supplied", () => {
        assert.ok(possibleAction.isValidEntry({
            foo: 1,
            bar: "bla",
        }));

        assert.ok(!possibleAction.isValidEntry({
            foo: 1,
        }));

        assert.ok(!possibleAction.isValidEntry({}));
    });

    it("can serialize and deserialize actions", () => {
        const newAction = GenericPossibleAction.deserialize(possibleAction.serialize());
        assert.deepEqual(newAction, possibleAction);
    });

    it("can return a human readable name", () => {
        assert.deepEqual(possibleAction.toString(), "Buy Action");
    });
});