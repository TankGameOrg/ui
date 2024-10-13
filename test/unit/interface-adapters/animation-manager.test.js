import assert from "node:assert";
import { animationsReducer, enableUnitTestNow, finishAnimation, startAnimation } from "../../../src/interface-adapters/animation-manager";
import { Position } from "../../../src/game/state/board/position";
import Board from "../../../src/game/state/board/board";
import Element from "../../../src/game/state/board/element";
import { spawn } from "node:child_process";

enableUnitTestNow();

let previousState = {
    board: new Board(2, 2),
};

previousState.board.setUnit(new Element({
    position: new Position("B2"),
    durability: 2,
}));

let currentState = {
    board: new Board(2, 2),
};

currentState.board.setUnit(new Element({
    position: new Position("A1"),
    durability: 5,
}));


function createAnimationStartingState({ animations = [], expectedIsForwardAnimation, previousEntryId = 0, currentEntryId = 1, previousDay = 1, currentDay = 1 }) {
    const versionConfig = {
        getAttributeDescriptor(animationKey, unit) {
            return {
                getAnimationStyle: () => ({
                    isAnimationStyle: true,
                    animationKey,
                    unit,
                }),
            };
        },
        getAnimationsForState(isForwardAnimation, previousGameState, currentGameState) {
            if (expectedIsForwardAnimation !== undefined) {
                assert.deepEqual(isForwardAnimation, expectedIsForwardAnimation);
            }

            assert.deepEqual(previousGameState, previousState);
            assert.deepEqual(currentGameState, currentState);
            return animations;
        },
    };

    const logBook = {
        getDayOfEntryId(entryId) {
            return entryId == previousEntryId ? previousDay : currentDay;
        }
    };

    let state = animationsReducer({}, {
        type: "set-version-config",
        versionConfig,
    });

    state = animationsReducer(state, {
        type: "set-log-book",
        logBook,
    });

    state = animationsReducer(state, {
        type: "set-current-state",
        entryId: previousEntryId,
        state: previousState,
    });

    state = animationsReducer(state, {
        type: "set-current-state",
        entryId: currentEntryId,
        state: currentState,
    });

    return state;
}

const basicAnimation = {
    type: "update-attribute",
    key: "durability",
    difference: -1,
    position: new Position("A1"),
};

const processedBasicAnimation = {
    A1: {
        id: "current-time-1",
        popups: {
            list: [
                {
                    attribute: "durability",
                    difference: "-1",
                    id: "0",
                    style: {
                        animationKey: "durability",
                        isAnimationStyle: true,
                        unit: 5,
                    },
                },
            ],
        },
    },
};

describe("AnimationManager", () => {
    it("can determine if an animation is forwards or backwards", () => {
        createAnimationStartingState({
            previousEntryId: 0,
            currentEntryId: 1,
            expectedIsForwardAnimation: true,
        });

        createAnimationStartingState({
            previousEntryId: 1,
            currentEntryId: 0,
            expectedIsForwardAnimation: false,
        });
    });

    it("displays animations for changes that are within one day", () => {
        const sameDay = createAnimationStartingState({
            animations: [basicAnimation],
            previousDay: 0,
            currentDay: 0,
        });

        assert.deepEqual(sameDay.animationData, processedBasicAnimation);

        const nextDay = createAnimationStartingState({
            animations: [basicAnimation],
            previousDay: 0,
            currentDay: 1,
        });

        assert.deepEqual(nextDay.animationData, processedBasicAnimation);

        const previousDay = createAnimationStartingState({
            animations: [basicAnimation],
            previousDay: 1,
            currentDay: 0,
        });

        assert.deepEqual(previousDay.animationData, processedBasicAnimation);

        const nextTwoDays = createAnimationStartingState({
            animations: [basicAnimation],
            previousDay: 2,
            currentDay: 4,
        });

        assert.deepEqual(nextTwoDays.animationData, {});

        const previousTwoDays = createAnimationStartingState({
            animations: [basicAnimation],
            previousDay: 3,
            currentDay: 5,
        });

        assert.deepEqual(previousTwoDays.animationData, {});

        const forwardManyDays = createAnimationStartingState({
            animations: [basicAnimation],
            previousDay: 7,
            currentDay: 42,
        });

        assert.deepEqual(forwardManyDays.animationData, {});

        const backManyDays = createAnimationStartingState({
            animations: [basicAnimation],
            previousDay: 88,
            currentDay: 31,
        });

        assert.deepEqual(backManyDays.animationData, {});
    });

    it("can process an update animation", () => {
        const state = createAnimationStartingState({
            animations: [basicAnimation],
        });

        assert.deepEqual(state.animationData, processedBasicAnimation);
    });

    it("can process a move animation", () => {
        const state = createAnimationStartingState({
            animations: [
                {
                    type: "update-attribute",
                    key: "position",
                    from: new Position("B2"),
                    to: new Position("A1"),
                    position: new Position("A1"),
                }
            ],
        });

        assert.deepEqual(state.animationData, {
            "A1": {
                id: "current-time-1",
                move: {
                    from: {
                        x: 1,
                        y: 1,
                    },
                    to: {
                        x: 0,
                        y: 0,
                    }
                },
                popups: {
                    list: [],
                },
            },
        });
    });

    it("can process a spawn animation", () => {
        const state = createAnimationStartingState({
            animations: [
                {
                    type: "spawn",
                    position: new Position("A1"),
                }
            ],
        });

        assert.deepEqual(state.animationData, {
            A1: {
                id: "current-time-1",
                popups: {
                    list: [],
                },
                spawn: {},
            },
        });
    });

    it("can process a destroy animation", () => {
        const state = createAnimationStartingState({
            animations: [
                {
                    type: "destroy",
                    position: new Position("B2"),
                    element: previousState.board.getUnitAt(new Position("B2")),
                }
            ],
        });

        assert.deepEqual(state.animationData, {
            B2: {
                id: "current-time-1",
                popups: {
                    list: [],
                },
                destroy: {
                    element: previousState.board.getUnitAt(new Position("B2")),
                },
            },
        });
    });

    it("can start and finish animations", () => {
        let state = createAnimationStartingState({
            animations: [
                {
                    type: "spawn",
                    position: new Position("A1"),
                },
                {
                    type: "destroy",
                    position: new Position("B2"),
                    element: previousState.board.getUnitAt(new Position("B2")),
                }
            ],
        });

        state = animationsReducer(state, startAnimation(new Position("A1"), "spawn", "current-time-1", 1234));
        assert.deepEqual(state.animationData, {
            A1: {
                id: "current-time-1",
                popups: {
                    list: [],
                },
                spawn: {
                    startTime: 1234,
                },
            },
            B2: {
                id: "current-time-2",
                popups: {
                    list: [],
                },
                destroy: {
                    element: previousState.board.getUnitAt(new Position("B2")),
                },
            },
        });

        state = animationsReducer(state, finishAnimation(new Position("A1"), "spawn", "current-time-1"));
        assert.deepEqual(state.animationData, {
            A1: {
                id: "current-time-1",
                popups: {
                    list: [],
                },
                spawn: undefined,
            },
            B2: {
                id: "current-time-2",
                popups: {
                    list: [],
                },
                destroy: {
                    element: previousState.board.getUnitAt(new Position("B2")),
                },
            },
        });
    });

    it("can not start animations", () => {
        let state = createAnimationStartingState({
            animations: [
                {
                    type: "spawn",
                    position: new Position("A1"),
                },
                {
                    type: "destroy",
                    position: new Position("B2"),
                    element: previousState.board.getUnitAt(new Position("B2")),
                }
            ],
        });

        const unmodifiedAnimationData = {
            A1: {
                id: "current-time-1",
                popups: {
                    list: [],
                },
                spawn: {},
            },
            B2: {
                id: "current-time-2",
                popups: {
                    list: [],
                },
                destroy: {
                    element: previousState.board.getUnitAt(new Position("B2")),
                },
            },
        };

        // No animation at that position
        state = animationsReducer(state, startAnimation(new Position("B1"), "spawn", "current-time-1", 1234));
        assert.deepEqual(state.animationData, unmodifiedAnimationData);

        // No destory animation at A1
        state = animationsReducer(state, startAnimation(new Position("A1"), "destory", "current-time-1", 1234));
        assert.deepEqual(state.animationData, unmodifiedAnimationData);

        // Wrong ID for the current animation
        state = animationsReducer(state, startAnimation(new Position("A1"), "spawn", "bad-id", 1234));
        assert.deepEqual(state.animationData, unmodifiedAnimationData);
    });
});
