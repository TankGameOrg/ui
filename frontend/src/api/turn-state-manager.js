import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { useTurn } from "./game";
import { TURN_SWITCH_FREQENCY } from "../config.js";
import GameState from "../../../common/game-state.mjs";


export function useTurnStateManager(turnMap, game) {
    const [turn, setTurn] = useState();
    const [trackingLastTurn, setTrackingLastTurn] = useState();
    const [playback, setPlayback] = useState(false);
    const [state, __] = useTurn(game, turn);

    // Change the current turn and track the last turn if we set it to that
    const setTurnAndTrackLastTurn = useCallback((newTurn) => {
        setTurn(newTurn);

        // If the user moves to the latest turn stay on the latest turn
        setTrackingLastTurn(newTurn >= turnMap.getLastTurn());
    }, [setTrackingLastTurn, setTurn, turnMap]);


    // If turn hasn't been set jump to the last turn
    if(turnMap && turn === undefined) {
        setTurnAndTrackLastTurn(turnMap.getLastTurn());
    }


    useEffect(() => {
        // Not playing nothing to do
        if(!playback || !turnMap) return () => {};

        // Hit the end stop playing
        if(turn == turnMap.getLastTurn()) {
            setPlayback(false);
            return () => {};
        }

        const handle = setTimeout(() => {
            setTurnAndTrackLastTurn(turnMap.findNextTurn(turn));
        }, TURN_SWITCH_FREQENCY);

        return () => clearTimeout(handle);
    }, [turnMap, turn, setTurnAndTrackLastTurn, playback]);

    const togglePlayback = useCallback(() => {
        setPlayback(!playback);
    }, [playback, setPlayback]);


    // If we're following the last turn and a new turn gets added change to that one
    useEffect(() => {
        if(trackingLastTurn && turnMap) {
            setTurn(turnMap.getLastTurn());
        }
    }, [turnMap, trackingLastTurn, setTurn]);


    const isLastTurn = turnMap ? turn >= turnMap.getLastTurn() : false;


    const playerSetTurn = newTurn => {
        setTurnAndTrackLastTurn(newTurn);
        // If the user changes the turn stop playback
        setPlayback(false);
    };

    const turnState = useMemo(() => state ? GameState.fromRawState(state.error, state.gameState) : undefined, [state]);

    return {
        rawTurnState: state,
        turnState,
        turnId: turn,
        isLastTurn,
        isPlayingBack: playback,
        togglePlayback,
        playerSetTurn,
    };
}
