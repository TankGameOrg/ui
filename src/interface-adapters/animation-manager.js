import { useEffect, useReducer } from "preact/hooks";
import { useGameClient } from "../drivers/rest/game-client.js";
import { findAnimationsBetweenStates } from "../game/state/animations.js";

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


function groupAnimations(animations, currentGameState) {
    let animationsByPosition = {};
    let nextId = 0;

    for(const animation of animations) {
        if(animationsByPosition[animation.position.humanReadable] === undefined) {
            animationsByPosition[animation.position.humanReadable] = {
                id: `${now()}-${++nextId}`,
                popups: {
                    list: [],
                },
            };
        }

        let animationsForTile =  animationsByPosition[animation.position.humanReadable];

        if(animation.key === "position") {
            animationsForTile.move = {
                from: animation.from,
                to: animation.to,
            };
            continue;
        }

        if(animation.type == "update-attribute" && animation.difference !== undefined) {
            const unit = currentGameState.board.getUnitAt(animation.position);

            animationsForTile.popups.list.push({
                id: animationsForTile.popups.list.length + "",
                attribute: animation.key,
                difference: `${animation.difference > 0 ? "+" : ""}${animation.difference}`,
                style: ANIMATION_STYLES[animation.key],
            });

            continue;
        }

        if(animation.type == "spawn") {
            animationsForTile[animation.type] = {};
            continue;
        }

        if(animation.type == "destroy") {
            animationsForTile[animation.type] = {
                element: animation.element,
            };

            continue;
        }
    }

    return animationsByPosition;
}


function buildAnimationData(entryId, previousEntryId, previousGameState, currentGameState, logBook) {
    let animations = [];
    // Show animations for entries that span 0 or 1 days
    const shouldDisplayAnimation = Math.abs(logBook.getDayOfEntryId(entryId) - logBook.getDayOfEntryId(previousEntryId)) < 2;
    const isForwardAnimation = entryId > previousEntryId;

    if(shouldDisplayAnimation && previousGameState) {
        animations = getAnimationsForState(isForwardAnimation, previousGameState, currentGameState);
    }

    return groupAnimations(animations, currentGameState);
}


function applyFinishAnimation(state, action) {
    const animationsForTile = state.animationData[action.position.humanReadable];
    if(!animationsForTile) return state;

    // This action was meant for an old animation discard it
    if(animationsForTile.id !== action.targetId) {
        return state;
    }

    return {
        ...state,
        animationData: {
            ...state.animationData,
            [action.position.humanReadable]: {
                ...animationsForTile,
                [action.animationKey]: undefined,
            },
        }
    }
}


function applyStartAnimation(state, action) {
    const animationsForTile = state.animationData[action.position.humanReadable];
    if(!animationsForTile) {
        return state;
    }

    // This action was meant for an old animation discard it
    if(animationsForTile.id !== action.targetId || animationsForTile[action.animationKey] === undefined) {
        return state;
    }

    return {
        ...state,
        animationData: {
            ...state.animationData,
            [action.position.humanReadable]: {
                ...animationsForTile,
                [action.animationKey]: {
                    ...animationsForTile[action.animationKey],
                    startTime: action.startTime,
                },
            },
        }
    }
}


export function animationsReducer(state, action) {
    if(action.type == "set-log-book") {
        return {
            ...state,
            _logBook: action.logBook,
        };
    }

    if(action.type == "set-current-state") {
        const previousEntryId = state._entryId;
        const previousState = state.currentState;

        return {
            ...state,
            currentState: action.state,
            _entryId: action.entryId,
            animationData: previousEntryId === action.entryId ?
                state.animationData :
                buildAnimationData(action.entryId, previousEntryId, previousState, action.state, state._logBook),
        };
    }

    if(action.type == "finish-animation") {
        return applyFinishAnimation(state, action);
    }

    if(action.type == "start-animation") {
        return applyStartAnimation(state, action);
    }

    return state;
}


export const startAnimation = (position, animationKey, targetId, startTime) => ({ type: "start-animation", position, animationKey, targetId, startTime });
export const finishAnimation = (position, animationKey, targetId) => ({ type: "finish-animation", position, animationKey, targetId });


export function useStateAndAnimationData(game, currentTurnMgrState, logBook) {
    const [animationsState, dispatch] = useReducer(animationsReducer, {});

    useEffect(() => {
        dispatch({ type: "set-log-book", logBook });
    }, [logBook, dispatch]);

    const [_, stateError] = useGameClient(game, async client => {
        if(currentTurnMgrState.entryId !== undefined) {
            const gameState = await client.getGameState(currentTurnMgrState.entryId);
            dispatch({
                type: "set-current-state",
                entryId: currentTurnMgrState.entryId,
                state: gameState,
            });
        }
    }, [currentTurnMgrState.entryId]);

    return [animationsState, dispatch, stateError];
}