import { Position } from "../../game/state/board/position.js";
import { updateEditorOnSelection } from "./editor.js";

export function updateSelectionAndEditor(state, action) {
    if(action.type == "select-location") {
        const {board} = state.initialState;

        const {locations, lastSelected} = updateSelectedLocations(state.locationSelector.locations, state.locationSelector.lastSelected, action);
        const editor = updateEditorOnSelection(board, locations);
        const clipboard = action.mode == "clear" ? undefined : state.clipboard;

        return {
            ...state,
            locationSelector: {
                ...state.locationSelector,
                locations,
                lastSelected,
            },
            editor,
            clipboard: clipboard?.updateCanPaste?.(board, lastSelected !== undefined ? new Position(lastSelected) : undefined),
        };
    }
}

function updateSelectedLocations(locations, lastSelected, action) {
    locations = (locations || []).slice(0);
    let updateLastSelected = true;

    // Toggle whether a given space is selected
    if(action.mode == "toggle-space") {
        const locationIndex = locations.indexOf(action.location);
        if(locationIndex !== -1) {
            locations.splice(locationIndex, 1);
            updateLastSelected = false;
        }
        else {
            locations.push(action.location);
        }
    }
    // Select a rectangle
    else if((action.mode == "select-area" || action.mode == "select-addtional-area") && lastSelected !== undefined) {
        const position = new Position(action.location);
        const lastPosition = new Position(lastSelected);

        if(action.mode == "select-area") {
            locations = [];
        }

        for(let x = Math.min(position.x, lastPosition.x), xLength = x + Math.abs(position.x - lastPosition.x) + 1; x < xLength; ++x) {
            for(let y = Math.min(position.y, lastPosition.y), yLength = y + Math.abs(position.y - lastPosition.y) + 1; y < yLength; ++y) {
                locations.push(new Position(x, y).humanReadable);
            }
        }

        updateLastSelected = false;
    }
    // Clear the selection
    else if(action.mode == "clear") {
        locations = [];
        updateLastSelected = false;
        lastSelected = undefined;
    }
    // Set selection (clear old)
    else {
        locations = [action.location];
    }

    // Remeber the last thing we selected for area selections
    if(updateLastSelected) {
        lastSelected = action.location;
    }

    return {locations, lastSelected};
}
