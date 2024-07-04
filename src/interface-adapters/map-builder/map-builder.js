import { useReducer } from "preact/hooks";
import { Position } from "../../game/state/board/position.js";
import Entity from "../../game/state/board/entity.js";
import { prettyifyName } from "../../utils.js";
import { Clipboard } from "./clipboard.js";

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
    state = { ...state, pasteErrorMessage: undefined };

    if(action.type == "select-location") {
        const {board} = state.initialState;
        const {locations, lastSelected} = updateLocation(state.locationSelector.locations, state.locationSelector.lastSelected, action);
        const position = locations.length > 0 ? new Position(locations[0]) : undefined;
        const entity = position ? board.getEntityAt(position) : undefined;
        const floorTile = position ? board.getFloorTileAt(position) : undefined;

        const entityEditable = areEntriesCompatible(locations, board.getEntityAt.bind(board));
        const floorTileEditable = areEntriesCompatible(locations, board.getFloorTileAt.bind(board));

        const clipBoard = action.mode == "clear" ? undefined : state.clipBoard;

        return {
            ...state,
            locationSelector: {
                ...state.locationSelector,
                locations,
                lastSelected,
            },
            editor: {
                entity: {
                    editable: entityEditable,
                    type: entity?.type,
                    attributes: Object.assign({}, entity?.attributes),
                    attributeErrors: {},
                },
                floorTile: {
                    editable: floorTileEditable,
                    type: floorTile?.type,
                    attributes: Object.assign({}, floorTile?.attributes),
                    attributeErrors: {},
                },
            },
            clipBoard,
            canPaste: lastSelected !== undefined ? state.clipBoard?.canPasteAt?.(board, new Position(lastSelected)): undefined,
        };
    }

    if(action.type == "set-selected-attribute" || action.type == "set-selected-entity-type") {
        if(state.locationSelector.locations?.length < 1) {
            throw new Error(`You must have a location selected to perform ${action.type}`);
        }

        let newBoard = state.initialState.board.clone();
        const positions = state.locationSelector.locations.map(location => new Position(location));
        const isSelectionInvalidated = state.clipBoard !== undefined && !!positions.find(position => state.clipBoard.doesModifyInvalidateSelection(position));

        const {board} = state.initialState;

        let getTarget = action.targetType == "entity" ?
                board.getEntityAt.bind(board) :
                board.getFloorTileAt.bind(board);

        let setTarget = action.targetType == "entity" ?
            newBoard.setEntity.bind(newBoard) :
            newBoard.setFloorTile.bind(newBoard);

        let editor = state.editor;

        const targetConfig = state._builderConfig[action.targetType][action.entityType || state.editor[action.targetType].type];

        if(action.type == "set-selected-attribute") {
            const [entityValue, errorMessage] = makeAttibuteValue(targetConfig, action.name, action.value)

            if(entityValue !== undefined) {
                for(const position of positions) {
                    let newEnity = getTarget(position).clone();
                    newEnity.attributes[action.name] = entityValue;
                    setTarget(newEnity);
                }
            }

            editor = {
                ...editor,
                [action.targetType]: {
                    ...editor[action.targetType],
                    attributes: {
                        ...editor[action.targetType].attributes,
                        [action.name]: action.value,
                    },
                    attributeErrors: {
                        ...editor[action.targetType].attributeErrors,
                        [action.name]: errorMessage,
                    },
                },
            };
        }
        else if(action.type == "set-selected-entity-type") {
            for(const position of positions) {
                setTarget(new Entity({
                    type: action.entityType,
                    position,
                    attributes: Object.assign({}, targetConfig?.defaultAttributes),
                }));
            }

            editor = {
                ...editor,
                [action.targetType]: {
                    editable: true,
                    type: action.entityType,
                    attributes: Object.assign({}, targetConfig?.defaultAttributes),
                    attributeErrors: {},
                }
            };
        }

        return {
            ...state,
            initialState: {
                ...state.initialState,
                board: newBoard,
            },
            editor,
            clipBoard: isSelectionInvalidated ? undefined : state.clipBoard,
        };
    }

    if(action.type == "resize-board") {
        const newBoard = state.initialState.board.cloneAndResize(action.resizeParameters);

        // Transfer selection so it is still in the same place on the new board or is removed if it was on the edge
        const locations = state.locationSelector.locations !== undefined ?
            state.locationSelector.locations
                .map(position => remapPosition(position, newBoard, action.resizeParameters))
                .filter(position => position !== undefined) :
            undefined;

        const lastSelected = state.locationSelector.lastSelected !== undefined ?
            remapPosition(state.locationSelector.lastSelected, newBoard, action.resizeParameters) :
            undefined;

        return {
            ...state,
            // Currently we don't support transforming the clipboard after resize
            clipBoard: undefined,
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

    if(action.type == "copy" || action.type == "cut") {
        if(state.locationSelector.locations?.length > 0) {
            const clipBoard = new Clipboard(state.initialState.board, state.locationSelector.locations, {
                isCut: action.type == "cut",
            });

            return {
                ...state,
                canPaste: clipBoard.canPasteAt(state.initialState.board, new Position(state.locationSelector.lastSelected)),
                clipBoard,
            };
        }
        else {
            // No selection can't cut/copy
            return state;
        }
    }

    if(action.type == "paste") {
        if(state.locationSelector.lastSelected === undefined || state.clipBoard === undefined) {
            // Nothing to paste or no location to paste at
            return state;
        }
        else if(!state.clipBoard.canPasteAt(state.initialState.board, new Position(state.locationSelector.lastSelected))) {
            return {
                ...state,
                pasteErrorMessage: `Cowardly refusing to paste outside of the board (clipboard contents are ${state.clipBoard.width} x ${state.clipBoard.height})`,
            };
        }
        else {
            const newBoard = state.clipBoard.paste(state.initialState.board, new Position(state.locationSelector.lastSelected));

            return {
                ...state,
                initialState: {
                    ...state.initialState,
                    board: newBoard,
                },
                // Only allow 1 paste after cutting
                clipBoard: state.clipBoard.isCut ? undefined : state.clipBoard,
            };
        }
    }

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

function remapPosition(position, board, { left = 0, top = 0 }) {
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

function makeAttibuteValue(targetConfig, name, value) {
    const attributeConfig = targetConfig.attributes[name];
    if(attributeConfig.type == "number") {
        value = +value;
        if(isNaN(value)) return [undefined, "Expected a number"];

        if(attributeConfig.min !== undefined && value < attributeConfig.min) {
            return [undefined, `${prettyifyName(name)} cannot be less than ${attributeConfig.min}`];
        }

        if(attributeConfig.max !== undefined && value > attributeConfig.max) {
            return [undefined, `${prettyifyName(name)} cannot be more than ${attributeConfig.max}`];
        }

        return [value, undefined];
    }

    return [value, undefined];
}

function areEntriesCompatible(locations, getEntityAt) {
    if(locations.length === 0) return false;

    const firstEntity = getEntityAt(new Position(locations[0]));
    let firstAttributeKeys = Object.keys(firstEntity.attributes);
    firstAttributeKeys.sort();

    for(let i = 1; i < locations.length; ++i) {
        const entity = getEntityAt(new Position(locations[i]));

        if(firstEntity.type != entity.type) return false;

        let attributeKeys = Object.keys(firstEntity.attributes);
        if(attributeKeys.length != firstAttributeKeys.length) return false;
        attributeKeys.sort();

        for(let j = 0; j < attributeKeys.length; ++j) {
            const key = attributeKeys[j];
            const firstKey = firstAttributeKeys[j];
            if(key != firstKey || entity.attributes[key] != firstEntity.attributes[key]) {
                return false;
            }
        }
    }

    return true;
}

function updateLocation(locations, lastSelected, action) {
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