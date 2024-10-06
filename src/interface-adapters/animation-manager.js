import { useEffect, useReducer } from "preact/hooks";
import { useGameClient } from "../drivers/rest/game-client.js";


function groupAnimations(animations, versionConfig, currentGameState) {
    let animationsByPosition = {};
    let nextId = 0;

    for(const animation of animations) {
        if(animationsByPosition[animation.position.humanReadable] === undefined) {
            animationsByPosition[animation.position.humanReadable] = {
                id: `${Date.now()}-${++nextId}`,
                popups: {
                    list: [],
                },
            };
        }

        let animationsForTile =  animationsByPosition[animation.position.humanReadable];

        if(animation.key === "position") {
            animationsForTile.move = animation;
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
    }

    return animationsByPosition;
}


function buildAnimationData(entryId, previousEntryId, versionConfig, previousGameState, currentGameState, logEntry) {
    let animations = [];
    const shouldDisplayAnimation = Math.abs(entryId - previousEntryId) === 1;
    const isForwardAnimation = entryId > previousEntryId;

    if(shouldDisplayAnimation && previousGameState) {
        animations = versionConfig.addAnimationData(isForwardAnimation, logEntry, previousGameState, currentGameState);
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
                [action.animationId]: undefined,
            },
        }
    }
}


function applyStartAnimation(state, action) {
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
                [action.animationId]: {
                    ...animationsForTile[action.animationId],
                    started: true,
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
                buildAnimationData(action.entryId, previousEntryId, state._versionConfig, previousState, action.state, state._logBook.getEntry(action.entryId)),
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


export const startAnimation = (position, animationId, targetId) => ({ type: "start-animation", position, animationId, targetId });
export const finishAnimation = (position, animationId, targetId) => ({ type: "finish-animation", position, animationId, targetId });


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