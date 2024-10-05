import { useEffect, useReducer } from "preact/hooks";
import { useGameClient } from "../drivers/rest/game-client.js";


function groupAnimations(animations) {
    let animationsByPosition = {};

    for(const animation of animations) {
        if(animationsByPosition[animation.position.humanReadable] === undefined) {
            animationsByPosition[animation.position.humanReadable] = {
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

        const fromValue = animation.from?.value ?? animation.from;
        const toValue = animation.to?.value ?? animation.to;
        if(animation.type == "update-attribute" && typeof fromValue == "number" && typeof toValue == "number") {
            const difference = toValue - fromValue;

            animationsForTile.popups.list.push({
                id: animationsForTile.popups.list.length + "",
                attribute: animation.key,
                difference: `${difference > 0 ? "+" : ""}${difference}`,
            });

            continue;
        }
    }

    return animationsByPosition;
}


function buildAnimationData(entryId, previousEntryId, versionConfig, previousGameState, currentGameState) {
    let animations = [];
    const shouldDisplayAnimation = Math.abs(entryId - previousEntryId) === 1;

    if(shouldDisplayAnimation && previousGameState) {
        animations = versionConfig.addAnimationData(previousGameState, currentGameState);
    }

    return groupAnimations(animations);
}


function applyFinishAnimation(state, action) {
    const animationsForTile = state.animationData[action.position.humanReadable];

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
            _versionConfig: action.versionConfig,
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
                buildAnimationData(action.entryId, previousEntryId, state._versionConfig, previousState, action.state),
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


export const startAnimation = (position, animationId) => ({ type: "start-animation", position, animationId });
export const finishAnimation = (position, animationId) => ({ type: "finish-animation", position, animationId });


export function useStateAndAnimationData(game, currentTurnMgrState, versionConfig) {
    const [animationsState, dispatch] = useReducer(animationsReducer, {});

    useEffect(() => {
        dispatch({ type: "set-version-config", versionConfig });
    }, [versionConfig, dispatch]);


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