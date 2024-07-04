import { useReducer } from "preact/hooks";
import { Position } from "../../game/state/board/position.js";
import { copyPasteReducer } from "./clipboard.js";
import { updateSelectionAndEditor } from "./selection.js";
import { editEntity } from "./editor.js";

const TARGET_TYPES = ["entity", "floorTile"];


function generateAllLocations(board) {
    let positions = [];

    for(let x = 0; x < board.width; ++x) {
        for(let y = 0; y < board.height; ++y) {
            positions.push(new Position(x, y).humanReadable);
        }
    }

    return positions;
}

function makeInitalState() {
    return {
        locationSelector: {
            isSelecting: false,
            selectableLocations: [],
        },
    };
}

export function mapBuilderReducer(state, action) {
    if(action.type == "set-map") {
        return {
            ...action.map,
            _builderConfig: action.builderConfig,
            entityTypes: Object.keys(action.builderConfig.entity),
            floorTileTypes: Object.keys(action.builderConfig.floorTile),
            locationSelector: {
                isSelecting: true,
                selectableLocations: generateAllLocations(action.map.initialState.board),
            },
            editor: {},
            resizeBoard: checkCanResize(action.map.initialState.board, action.builderConfig),
        };
    }

    if(state?.gameSettings === undefined && state?.initialState === undefined) {
        throw new Error("set-map must be called before any other action");
    }

    // Clear previous error messages
    state = { ...state, errorMessage: undefined };

    let newState = updateSelectionAndEditor(state, action);
    if(newState) return newState;

    newState = editEntity(state, action);
    if(newState) return newState;

    if(action.type == "resize-board") {
        const newBoard = state.initialState.board.cloneAndResize(action.resizeParameters);

        const remapPosition = position => remapPositionForResize(position, newBoard, action.resizeParameters);

        // Transfer selection so it is still in the same place on the new board or is removed if it was on the edge
        const locations = state.locationSelector.locations !== undefined ?
            state.locationSelector.locations
                .map(position => remapPosition(position))
                .filter(position => position !== undefined) :
            undefined;

        const lastSelected = state.locationSelector.lastSelected !== undefined ?
            remapPosition(state.locationSelector.lastSelected) :
            undefined;

        // Update the clipboard position to fit on the resized board
        const clipboard = state?.clipboard?.remapPositions?.(newBoard, lastSelected !== undefined ? new Position(lastSelected): undefined, remapPosition);

        return {
            ...state,
            clipboard,
            initialState: {
                ...state.initialState,
                board: newBoard,
            },
            locationSelector: {
                ...state.locationSelector,
                // Make all of the locations on the new board selectable
                selectableLocations: generateAllLocations(newBoard),
                locations,
                lastSelected,
            },
            resizeBoard: checkCanResize(newBoard, state._builderConfig),
            // Reset the editor if the location we're editing is removed
            editor: locations?.length > 0 ? state.editor : {},
        };
    }

    newState = copyPasteReducer(state, action);
    if(newState != undefined) return newState;

    throw new Error(`Action type ${action.type} is not valid`);
}

function checkCanResize(board, builderConfig) {
    return {
        canGrowX: board.width < builderConfig.board.maxWidth,
        canGrowY: board.height < builderConfig.board.maxHeight,
        canShrinkX: board.width > 1,
        canShrinkY: board.height > 1,
    };
}

function remapPositionForResize(position, board, { left = 0, top = 0 }) {
    try {
        position = new Position(position);
        position = new Position(position.x + left, position.y + top);
        if(!board.isInBounds(position)) return;
        return position.humanReadable;
    }
    catch(err) {
        return;
    }
}

export function useMapBuilder() {
    return useReducer(mapBuilderReducer, makeInitalState());
}

export const setMap = (map, builderConfig) => ({ type: "set-map", map, builderConfig });
export const selectLocation = (location, mode) => ({ type: "select-location", location, mode });
export const clearSelection = () => selectLocation(undefined, "clear");
export const setSelectedAttibute = (targetType, name, value) => ({ type: "set-selected-attribute", targetType, name, value });
export const setSelectedEntityType = (targetType, entityType) => ({ type: "set-selected-entity-type", targetType, entityType });
export const resizeBoard = (resizeParameters) => ({ type: "resize-board", resizeParameters });
export const cut = () => ({ type: "cut" });
export const copy = () => ({ type: "copy" });
export const paste = () => ({ type: "paste" });


export function deleteSelected(dispatch) {
    for(const targetType of TARGET_TYPES) {
        dispatch(setSelectedEntityType(targetType, "empty"));
    }
}