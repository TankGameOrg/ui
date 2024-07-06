import Entity from "../../game/state/board/entity.js";
import { Position } from "../../game/state/board/position.js";
import { prettyifyName } from "../../utils.js";
import { updateClipboardOnModify } from "./clipboard.js";

export function updateEditorOnSelection(board, locations) {
    const position = locations.length > 0 ? new Position(locations[0]) : undefined;
    const entity = position ? board.getEntityAt(position) : undefined;
    const floorTile = position ? board.getFloorTileAt(position) : undefined;

    const entityEditable = areEntriesCompatible(locations, board.getEntityAt.bind(board));
    const floorTileEditable = areEntriesCompatible(locations, board.getFloorTileAt.bind(board));

    return {
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
        }
    };
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


export function editEntityReducer(state, action) {
    if(action.type == "set-selected-attribute" || action.type == "set-selected-entity-type") {
        if(state.locationSelector.locations?.length < 1) {
            throw new Error(`You must have a location selected to perform ${action.type}`);
        }

        let newBoard = state.initialGameState.board.clone();
        const positions = state.locationSelector.locations.map(location => new Position(location));

        const {board} = state.initialGameState;

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
            initialGameState: {
                ...state.initialGameState,
                board: newBoard,
            },
            editor,
            clipboard: updateClipboardOnModify(state.clipboard, positions),
        };
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
