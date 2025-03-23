import { findAnimationsBetweenStates } from "../game/state/animations.js";
import { getCell, modifyCell } from "./game/board/state.js";
import { deepClone } from "../utils.js";
import { makeBoardCell } from "./game/board/game-state-adapter.js";

let now = () => Date.now();

export function enableUnitTestNow() {
    now = () => "current-time";
}

const ANIMATION_STYLES = {
    durability: {
        background: "#f00",
        color: "#fff",
    },

    range: {
        background: "#050",
        color: "#fff",
    },

    speed: {
        background: "#f0f",
        color: "#fff",
    },

    gold: {
        background: "#fd0",
        color: "#000",
    },

    bounty: {
        background: "orange",
        color: "#000",
    },

    actions: {
        background: "blue",
        color: "#fff",
    },
};


const COST_ATTRIBUTES = new Set(["actions", "gold"]);


function getAnimationsForState(isForwardAnimation, previousState, currentState) {
    const animations = findAnimationsBetweenStates(previousState, currentState, {
        attributesToAnimate: [
            "position", // Track player movement
            "dead", // Certain attribute changes shouldn't be shown on death
            // Interesting attributes
            "gold",
            "bounty",
            "speed",
            "range",
            "durability",
            "actions",
        ],
    });

    const positionsWithDeathChange = new Set(
        animations
            .filter(animation => animation.key == "dead")
            .map(animation => animation.position.humanReadable)
    );

    return animations
        .filter((animation) => {
            // Death triggers a bunch of attribute changes including +2 durability
            // Hide all of them to keep from confusing users
            if(positionsWithDeathChange.has(animation.position.humanReadable)) {
                return false;
            }

            // Don't show the changes to the cost attribute
            if(COST_ATTRIBUTES.has(animation.key) && animation.type == "update-attribute" && animation.difference < 0) {
                return false;
            }

            // Position is the only attribute change that can be reversed
            if(!isForwardAnimation && animation.type == "update-attribute" && animation.difference !== undefined) {
                return false;
            }

            return true;
        });
}


function applyAnimationsToBoard(boardState, animations, previousGameState) {
    let nextId = 0;

    for(const animation of animations) {
        let {animations} = getCell(boardState, animation.position);

        if(animations === undefined) {
            animations = {
                id: `${now()}-${++nextId}`,
                popups: {
                    list: [],
                },
            };
        }
        else {
            animations = deepClone(animations);
        }

        if(animation.key === "position") {
            animations.move = {
                from: animation.from,
                to: animation.to,
            };
        }
        else if(animation.type == "update-attribute" && animation.difference !== undefined) {
            animations.popups.list.push({
                id: animations.popups.list.length + "",
                attribute: animation.key,
                difference: `${animation.difference > 0 ? "+" : ""}${animation.difference}`,
                style: ANIMATION_STYLES[animation.key],
            });
        }
        else if(animation.type == "spawn") {
            animations[animation.type] = {};
        }
        else if(animation.type == "destroy") {
            animations[animation.type] = {
                postDestroyCell: getCell(boardState, animation.position),
            };

            boardState = modifyCell(boardState, animation.position, () => ({
                ...makeBoardCell(previousGameState, animation.element.position.x, animation.element.position.y),
                animations,
            }));

            // Deleted actions recreate the previous cell to play the destroy animation
            continue;
        }

        boardState = modifyCell(boardState, animation.position, cell => ({ ...cell, animations }));
    }

    return boardState;
}


export function buildAnimationData(boardState, entryId, previousEntryId, previousGameState, currentGameState, logBook) {
    let animations = [];
    // Show animations for entries that span 0 or 1 days
    const shouldDisplayAnimation = Math.abs(logBook.getDayOfEntryId(entryId) - logBook.getDayOfEntryId(previousEntryId)) < 2;
    const isForwardAnimation = entryId > previousEntryId;

    if(shouldDisplayAnimation && previousGameState) {
        animations = getAnimationsForState(isForwardAnimation, previousGameState, currentGameState);
    }

    return applyAnimationsToBoard(boardState, animations, previousGameState);
}


export function applyFinishAnimation(boardState, action) {
    const {animations} = getCell(boardState, action.position);
    if(animations === undefined) {
        return boardState;
    }

    // This action was meant for an old animation discard it
    if(animations.id !== action.targetId) {
        return boardState;
    }

    return modifyCell(boardState, action.position, cell => {
        if(action.animationKey == "destroy") {
            cell = animations.destroy.postDestroyCell;
        }

        return {
            ...cell,
            animations: {
                ...animations,
                [action.animationKey]: undefined,
            }
        };
    });
}


export function applyStartAnimation(boardState, action) {
    const {animations} = getCell(boardState, action.position);
    if(animations === undefined) {
        return boardState;
    }

    // This action was meant for an old animation discard it
    if(animations.id !== action.targetId || animations[action.animationKey] === undefined) {
        return boardState;
    }

    return modifyCell(boardState, action.position, cell => ({
        ...cell,
        animations: {
            ...animations,
            [action.animationKey]: {
                ...animations[action.animationKey],
                startTime: action.startTime,
            },
        }
    }));
}

