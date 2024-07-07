import Entity from "../../game/state/board/entity.js";
import { Position } from "../../game/state/board/position.js";
import { deepClone, prettyifyName } from "../../utils.js";
import { updateClipboardOnModify } from "./clipboard.js";

export function updateEditorOnSelection({board, metaEntities}, locations) {
    const position = locations.length > 0 ? new Position(locations[0]) : undefined;
    const entity = position ? board.getEntityAt(position) : undefined;
    const floorTile = position ? board.getFloorTileAt(position) : undefined;

    const entityEditable = areEntriesCompatible(locations, board.getEntityAt.bind(board));
    const floorTileEditable = areEntriesCompatible(locations, board.getFloorTileAt.bind(board));

    let editorMetaEntities = {};

    for(const entityKey of Object.keys(metaEntities)) {
        editorMetaEntities[entityKey] = {
            name: entityKey,
            type: metaEntities[entityKey].type,
            attributes: deepClone(metaEntities[entityKey].attributes),
            attributeErrors: {},
        };
    }

    return {
        entity: {
            editable: entityEditable,
            type: entity?.type,
            attributes: deepClone(entity?.attributes),
            attributeErrors: {},
        },
        floorTile: {
            editable: floorTileEditable,
            type: floorTile?.type,
            attributes: deepClone(floorTile?.attributes),
            attributeErrors: {},
        },
        metaEntities: editorMetaEntities,
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
        if(state.locationSelector.locations === undefined || state.locationSelector.locations.length < 1) {
            return state;
        }

        const {board} = state.map.initialGameState;
        let newBoard = board.clone();
        const positions = state.locationSelector.locations.map(location => new Position(location));

        let getTarget = action.targetType == "entity" ?
                board.getEntityAt.bind(board) :
                board.getFloorTileAt.bind(board);

        let setTarget = action.targetType == "entity" ?
            newBoard.setEntity.bind(newBoard) :
            newBoard.setFloorTile.bind(newBoard);

        let editor = state.editor;

        const targetConfig = state._builderConfig[action.targetType][action.entityType || state.editor[action.targetType].type];

        if(action.type == "set-selected-attribute") {
            const [entityValue, errorMessage] = makeAttibuteValue(targetConfig, action.name, action.value);

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
                    attributes: deepClone(targetConfig?.defaultAttributes),
                }));
            }

            editor = {
                ...editor,
                [action.targetType]: {
                    editable: true,
                    type: action.entityType,
                    attributes: deepClone(targetConfig?.defaultAttributes),
                    attributeErrors: {},
                }
            };
        }

        state = {
            ...state,
            map: {
                ...state.map,
                initialGameState: state.map.initialGameState.modify({
                    board: newBoard,
                }),
            },
            editor,
            clipboard: updateClipboardOnModify(state.clipboard, positions),
        };

        state.onChange(state.map);

        return state;
    }
    else if(action.type == "set-meta-entity-attribute") {
        const editorMetaEntity = state.editor.metaEntities[action.entityName];
        const targetConfig = state._builderConfig.metaEntities[editorMetaEntity.type];
        const [entityValue, errorMessage] = makeAttibuteValue(targetConfig, action.name, action.value);

        if(entityValue !== undefined) {
            let metaEntity = state.map.initialGameState.metaEntities[action.entityName].clone();
            metaEntity.attributes[action.name] = entityValue;

            state = {
                ...state,
                map: {
                    ...state.map,
                    initialGameState: state.map.initialGameState.modify({
                        metaEntities: {
                            ...state.map.initialGameState.metaEntities,
                            [action.entityName]: metaEntity,
                        },
                    }),
                },
            };
        }

        state = {
            ...state,
            editor: {
                ...state.editor,
                metaEntities: {
                    ...state.editor.metaEntities,
                    [action.entityName]: {
                        ...editorMetaEntity,
                        attributes: {
                            ...state.editor.metaEntities[action.entityName].attributes,
                            [action.name]: action.value,
                        },
                        attributeErrors: {
                            ...state.editor.metaEntities[action.entityName].attributeErrors,
                            [action.name]: errorMessage,
                        },
                    },
                },
            }
        };

        state.onChange(state.map);

        return state;
    }
}


function makeAttibuteValue(targetConfig, name, value) {
    const attributeConfig = targetConfig.attributes[name];
    if(!attributeConfig) {
        return [undefined, `Attribute ${name} is not supported`];
    }

    if(attributeConfig.type == "number") {
        let max = attributeConfig.max;

        // This value has a user configured max separate the value and max
        const hasMax = value?.value !== undefined && value?.max !== undefined;
        if(hasMax) {
            max = +value.max;
            if(isNaN(max)) return [undefined, "Expected a number for max"];

            // If we have a limit make sure that the user's max respects that
            if(attributeConfig.max !== undefined && max > attributeConfig.max) {
                return [undefined, `${prettyifyName(name)}'s max cannot be more than ${attributeConfig.max}`];
            }

            value = value.value;
        }

        value = +value;
        if(isNaN(value)) return [undefined, "Expected a number"];

        if(attributeConfig.min !== undefined && value < attributeConfig.min) {
            return [undefined, `${prettyifyName(name)} cannot be less than ${attributeConfig.min}`];
        }

        if(max !== undefined && value > max) {
            return [undefined, `${prettyifyName(name)} cannot be more than ${max}`];
        }

        if(hasMax) {
            value = {value, max};
        }

        return [value, undefined];
    }

    return [value, undefined];
}
