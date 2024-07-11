import { useReducer } from "preact/hooks";
import { copyPasteReducer } from "./clipboard.js";
import { updateSelectionAndEditorReducer } from "./selection.js";
import { editEntityReducer, updateEditorOnSelection } from "./editor.js";
import { checkCanResize, generateAllLocations, resizeBoardReducer } from "./board-resize.js";

const TARGET_TYPES = ["entity", "floorTile"];


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
            map: action.map,
            _builderConfig: action.builderConfig,
            entityTypes: Object.keys(action.builderConfig.entity),
            floorTileTypes: Object.keys(action.builderConfig.floorTile),
            locationSelector: {
                isSelecting: true,
                selectableLocations: generateAllLocations(action.map.initialGameState.board),
            },
            editor: updateEditorOnSelection(action.map.initialGameState, [], action.builderConfig),
            resizeBoard: checkCanResize(action.map.initialGameState.board, action.builderConfig),
            onChange: action.onChange,
        };
    }

    if(state?.gameSettings === undefined && state?.map?.initialGameState === undefined) {
        throw new Error("set-map must be called before any other action");
    }

    // Clear previous error messages
    state = { ...state, errorMessage: undefined };

    let newState = updateSelectionAndEditorReducer(state, action);
    if(newState !== undefined) return newState;

    newState = editEntityReducer(state, action);
    if(newState !== undefined) return newState;

    newState = resizeBoardReducer(state, action);
    if(newState !== undefined) return newState;

    newState = copyPasteReducer(state, action);
    if(newState !== undefined) return newState;

    throw new Error(`Action type ${action.type} is not valid`);
}

export function useMapBuilder() {
    return useReducer(mapBuilderReducer, makeInitalState());
}

export const setMap = (map, builderConfig, onChange) => ({ type: "set-map", map, builderConfig, onChange });
export const selectLocation = (location, mode) => ({ type: "select-location", location, mode });
export const clearSelection = () => selectLocation(undefined, "clear");
export const setMetaEntityAttibute = (entityName, name, value) => ({ type: "set-meta-entity-attribute", entityName, name, value });
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