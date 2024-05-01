import assert from "node:assert";
import { deepMerge } from "../../../common/state/config/merge.mjs";

describe("Config", () => {
    it("can merge two objects", () => {
        const objectA = {
            primative: 1,
            notInB: "yeah",
            array: [1, 2],
            nonMergedArray: [0],
            foo: {
                bar: {
                    notInB: 1,
                    dontMerge: { bop: 1 }
                },
                other: {
                    no: 2,
                    yes: false,
                }
            },
        };

        const objectB = {
            primative: 2,
            notInA: "also yeah",
            array: [3, 4],
            nonMergedArray: [1, 2, 3],
            foo: {
                bar: {
                    notInA: 1,
                    dontMerge: { baz: 2 },
                },
                other: {
                    yes: true,
                },
            },
        };

        const merged = deepMerge([objectA, objectB], {
            objectsToOverwrite: [
                "/nonMergedArray",
                "/foo/bar/dontMerge"
            ],
        });

        assert.deepEqual(merged, {
            primative: 2,
            notInB: "yeah",
            notInA: "also yeah",
            array: [1, 2, 3, 4],
            nonMergedArray: [1, 2, 3],
            foo: {
                bar: {
                    notInB: 1,
                    notInA: 1,
                    dontMerge: { baz: 2 },
                },
                other: {
                    no: 2,
                    yes: true,
                },
            },
        });
    });

    it("can ignore specified paths", () => {
        const objectA = {
            primative: 1,
            iAm: "ignored",
            foo: {
                bar: "ignored",
                baz: true,
            }
        };

        const objectB = {
            primative: 2,
            foo: {
                bar: "ignored",
                baz: false,
            }
        };

        const merged = deepMerge([objectA, objectB], {
            pathsToIgnore: [
                "/iAm",
                "/foo/bar"
            ],
        });

        assert.deepEqual(merged, {
            primative: 2,
            foo: {
                baz: false,
            }
        });
    });
});