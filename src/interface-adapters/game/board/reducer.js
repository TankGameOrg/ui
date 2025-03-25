import { createSlice } from "@reduxjs/toolkit";
import { boardFromBoard } from "./game-state-adapter.js";
import { applyFinishAnimation, applyStartAnimation, buildAnimationData } from "../../animation-manager.js";
import { getCell, modifyAllCells, modifyCellsFromList } from "./state.js";
import { useDispatch } from "react-redux";
import { getGameClient, useGameClient } from "../../../drivers/rest/game-client.js";

const boardSlice = createSlice({
    name: "board",
    initialState: {},
    reducers: {
        setBoard: (state, action) => {
            return {
                ...state,
                board: action.payload,
            };
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
                    modifyCellInList: cell => ({
                        ...cell,
                        showPopup: false,
                        isDisabled: false,
                        isSelected: false,
                    }),
                    modifyOtherCell: cell => ({
                        ...cell,
                        showPopup: false,
                        isDisabled: true,
                        isSelected: false,
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

        selectCell: (state, action) => {
            return {
                ...state,
                board: modifyAllCells(state.board, (current, position) => ({
                    ...current,
                    isSelected: position.x === action.payload.x && position.y === action.payload.y,
                })),
            };
        },

        showPopup: (state, action) => {
            let cell = getCell(state.board, action.payload.position);
            cell.showPopup = true;
        },

        closeAllPopups: (state) => {
            return {
                ...state,
                board: modifyAllCells(state.board, (current) => ({
                    ...current,
                    showPopup: false,
                })),
            };
        },
    }
});

export default boardSlice.reducer;
export const {startAnimation, finishAnimation, startSelecting, stopSelecting, showPopup, closeAllPopups, selectCell} = boardSlice.actions;


export function importBoard(game, currentTurnMgrState, logBook, canSubmitAction) {
    return async (dispatch) => {
        if(!game && currentTurnMgrState.entryId === undefined) return;

        const client = getGameClient(game);

        // TODO: Handle exceptions
        const [previousState, currentState] = await Promise.all([
            currentTurnMgrState.previousStateId !== undefined ?
                client.getGameState(currentTurnMgrState.previousStateId) : undefined,
            currentTurnMgrState.entryId !== undefined ?
                client.getGameState(currentTurnMgrState.entryId) : undefined,
        ]);

        if(currentState !== undefined) {
            let board = boardFromBoard(currentState, canSubmitAction);

            if(previousState !== undefined) {
                board = buildAnimationData(
                    board,
                    currentTurnMgrState.entryId,
                    currentTurnMgrState.previousStateId,
                    previousState,
                    currentState,
                    logBook);
            }

            dispatch(boardSlice.actions.setBoard(board));
        }
    };
}
