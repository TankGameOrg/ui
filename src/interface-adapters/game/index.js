import { combineReducers } from "@reduxjs/toolkit";
import boardReducer from "./board/reducer.js";

export const reducers = combineReducers({
    board: boardReducer,
});
