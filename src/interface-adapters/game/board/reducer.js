import { createSlice } from "@reduxjs/toolkit";
import { boardFromBoard } from "./game-state-adapter.js";
import { applyFinishAnimation, applyStartAnimation, buildAnimationData } from "../../animation-manager.js";
import { modifyAllCells, modifyCellsFromList } from "./state.js";
import { useDispatch } from "react-redux";
import { useGameClient } from "../../../drivers/rest/game-client.js";

const boardSlice = createSlice({
    name: "board",
    initialState: {},
    reducers: {
        importBoard: (state, action) => {
            if(action.payload.currentState !== undefined) {
                let board = boardFromBoard(action.payload.currentState);
    
                if(action.payload.previousState !== undefined) {
                    board = buildAnimationData(
                        board,
                        action.payload.entryId,
                        action.payload.previousStateId,
                        action.payload.previousState,
                        action.payload.currentState,
                        action.payload.logBook);
                }
    
                return {
                    ...state,
                    board,
                };
            }
    
            return null;
        },

        startAnimation: (state, action) => {
            return {
                ...state,
                board: applyStartAnimation(state.board, action.payload),
            };
        },

        finishAnimation: (state, action) => {
            return {
                ...state,
                board: applyFinishAnimation(state.board, action.payload),
            };
        },

        startSelecting: (state, action) => {
            return {
                ...state,
                isSelecting: true,
                board: modifyCellsFromList(state.board, {
                    list: action.payload.selectable,
                    modifyCellsFromList: cell => ({
                        ...cell,
                        showPopup: false,
                        isDisabled: false,
                    }),
                    modifyOtherCell: cell => ({
                        ...cell,
                        showPopup: false,
                        isDisabled: true,
                    }),
                }),
            };
        },

        stopSelecting: (state) => {
            return {
                ...state,
                isSelecting: false,
                board: modifyAllCells(state.board, (current) => ({
                    ...current,
                    isSelected: false,
                    isDisabled: false,
                })),
            };
        },
    }
});

export default boardSlice.reducer;
export const {importBoard, startAnimation, finishAnimation, startSelecting, stopSelecting} = boardSlice.actions;


export function useGameClientBoardHook(game, currentTurnMgrState, logBook) {
    const dispatch = useDispatch();

    const [_, stateError] = useGameClient(game, async client => {
        if(currentTurnMgrState.entryId !== undefined) {
            const [previousState, currentState] = await Promise.all([
                currentTurnMgrState.previousStateId !== undefined ?
                    client.getGameState(currentTurnMgrState.previousStateId) : undefined,
                currentTurnMgrState.entryId !== undefined ?
                    client.getGameState(currentTurnMgrState.entryId) : undefined,
            ]);

            dispatch(importBoard({
                logBook,
                entryId: currentTurnMgrState.entryId,
                previousStateId: currentTurnMgrState.previousStateId,
                previousState,
                currentState,
            }));
        }
    }, [currentTurnMgrState.entryId, currentTurnMgrState.previousStateId, dispatch]);

    return stateError;
}