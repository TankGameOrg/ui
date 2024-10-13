import { useEffect, useReducer } from "preact/hooks";
import { useGameClient } from "../drivers/rest/game-client.js";

let now = () => Date.now();

export function enableUnitTestNow() {
    now = () => "current-time";
}

function groupAnimations(animations, versionConfig, currentGameState) {
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
            const attributeConfig = versionConfig.getAttributeDescriptor(animation.key, unit[animation.key]);

            animationsForTile.popups.list.push({
                id: animationsForTile.popups.list.length + "",
                attribute: animation.key,
                difference: `${animation.difference > 0 ? "+" : ""}${animation.difference}`,
                style: attributeConfig.getAnimationStyle(),
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


function buildAnimationData(entryId, previousEntryId, versionConfig, previousGameState, currentGameState, logBook) {
    let animations = [];
    // Show animations for entries that span 0 or 1 days
    const shouldDisplayAnimation = Math.abs(logBook.getDayOfEntryId(entryId) - logBook.getDayOfEntryId(previousEntryId)) < 2;
    const isForwardAnimation = entryId > previousEntryId;

    if(shouldDisplayAnimation && previousGameState) {
        animations = versionConfig.getAnimationsForState(isForwardAnimation, previousGameState, currentGameState);
    }

    return groupAnimations(animations, versionConfig, currentGameState);
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
    if(action.type == "set-version-config") {
        return {
            ...state,
            _versionConfig: action.versionConfig,
        };
    }

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
                buildAnimationData(action.entryId, previousEntryId, state._versionConfig, previousState, action.state, state._logBook),
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


export function useStateAndAnimationData(game, currentTurnMgrState, versionConfig, logBook) {
    const [animationsState, dispatch] = useReducer(animationsReducer, {});

    useEffect(() => {
        dispatch({ type: "set-version-config", versionConfig });
    }, [versionConfig, dispatch]);

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