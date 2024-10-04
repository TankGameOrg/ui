import { useEffect, useReducer } from "preact/hooks";
import { useGameClient } from "../drivers/rest/game-client.js";


function groupAnimations(animations) {
    let animationsByPosition = {};

    for(const animation of animations) {
        if(animationsByPosition[animation.position.humanReadable] === undefined) {
            animationsByPosition[animation.position.humanReadable] = {
                animations: [],
            };
        }

        let animationsForTile =  animationsByPosition[animation.position.humanReadable];

        if(animation.key === "position") {
            animationsForTile.move = animation;
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
    let animationsForTile = state.animationData[action.position.humanReadable];

    if(action.animationId == "move") {
        animationsForTile = {
            ...animationsForTile,
            move: undefined,
        };
    }

    return {
        ...state,
        animationData: {
            ...state.animationData,
            [action.position.humanReadable]: animationsForTile,
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
            animationData: buildAnimationData(action.entryId, previousEntryId, state._versionConfig, previousState, action.state),
        };
    }

    if(action.type == "finish-animation") {
        return applyFinishAnimation(state, action);
    }

    return state;
}


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