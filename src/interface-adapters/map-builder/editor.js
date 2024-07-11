import Entity from "../../game/state/board/entity.js";
import { Position } from "../../game/state/board/position.js";
import { deepClone, prettyifyName } from "../../utils.js";
import { updateClipboardOnModify } from "./clipboard.js";

class AttributeEditor {
    constructor({ entities, builderEntitiyConfig, cloneState, modifyEntity }) {
        this._entities = entities;
        this._modifyEntity = modifyEntity;
        this._cloneState = cloneState;
        this.builderEntitiyConfig = builderEntitiyConfig;
        this.attributes = entities.length > 0 ? deepClone(entities[0].attributes) : undefined;
        this.attributeErrors = {};
    }

    changeType(state, newType, builderEntitiyConfig) {
        if(this._cloneState) {
            state = this._cloneState(state);
        }

        const entities = this._entities.map(entity => {
            const newEntity = new Entity({
                type: newType,
                position: entity.position,
                attributes: deepClone(builderEntitiyConfig.defaultAttributes),
            });

            state = this._modifyEntity(state, newEntity);

            return newEntity;
        });

        const newEditor = new AttributeEditor({
            entities,
            builderEntitiyConfig,
            cloneState: this._cloneState,
            modifyEntity: this._modifyEntity,
        });

        return [state, newEditor];
    }

    editAttribute(state, attributeName, attributeValue) {
        const [entityValue, errorMessage] = makeAttibuteValue(this.builderEntitiyConfig, attributeName, attributeValue);

        let newEntities = this._entities;
        if(entityValue !== undefined) {
            if(this._cloneState) {
                state = this._cloneState(state);
            }

            newEntities = this._entities.map(entity => {
                entity = entity.clone();
                entity.attributes[attributeName] = entityValue;
                state = this._modifyEntity(state, entity);
                return entity;
            });
        }

        let newAttributeEditor = new AttributeEditor({
            entities: newEntities,
            builderEntitiyConfig: this.builderEntitiyConfig,
            cloneState: this._cloneState,
            modifyEntity: this._modifyEntity,
        });

        newAttributeEditor.attributes[attributeName] = attributeValue;
        newAttributeEditor.attributeErrors[attributeName] = errorMessage;
        return [state, newAttributeEditor];
    }
}

export function updateEditorOnSelection({board, metaEntities}, locations, builderConfig) {
    const positions = locations.map(location => new Position(location));
    const entity = positions.length > 0 ? board.getEntityAt(positions[0]) : undefined;
    const floorTile = positions.length > 0 ? board.getFloorTileAt(positions[0]) : undefined;

    const entityEditable = areEntriesCompatible(positions, board.getEntityAt.bind(board));
    const floorTileEditable = areEntriesCompatible(positions, board.getFloorTileAt.bind(board));

    let editorMetaEntities = {};

    for(const entityKey of Object.keys(metaEntities)) {
        editorMetaEntities[entityKey] = {
            name: entityKey,
            attributeEditor: new AttributeEditor({
                entities: [metaEntities[entityKey]],
                builderEntitiyConfig: builderConfig.metaEntities[metaEntities[entityKey].type],
                modifyEntity: (map, entity) => ({
                    ...map,
                    initialGameState: map.initialGameState.modify({
                        metaEntities: {
                            ...map.initialGameState.metaEntities,
                            [entityKey]: entity,
                        },
                    }),
                }),
            }),
        };
    }

    const cloneBoard = (map) => ({
        ...map,
        initialGameState: map.initialGameState.modify({
            board: map.initialGameState.board.clone(),
        }),
    });

    return {
        entity: {
            editable: entityEditable,
            type: entity?.type,
            attributeEditor: new AttributeEditor({
                entities: positions.map(position => board.getEntityAt(position)),
                builderEntitiyConfig: builderConfig.entity[entity?.type],
                cloneState: cloneBoard,
                modifyEntity: (map, entity) => {
                    map.initialGameState.board.setEntity(entity);
                    return map;
                },
            }),
        },
        floorTile: {
            editable: floorTileEditable,
            type: floorTile?.type,
            attributeEditor: new AttributeEditor({
                entities: positions.map(position => board.getFloorTileAt(position)),
                builderEntitiyConfig: builderConfig.floorTile[floorTile?.type],
                cloneState: cloneBoard,
                modifyEntity: (map, entity) => {
                    map.initialGameState.board.setFloorTile(entity);
                    return map;
                },
            }),
        },
        metaEntities: editorMetaEntities,
    };
}

function areEntriesCompatible(positions, getEntityAt) {
    if(positions.length === 0) return false;

    const firstEntity = getEntityAt(positions[0]);
    let firstAttributeKeys = Object.keys(firstEntity.attributes);
    firstAttributeKeys.sort();

    for(let i = 1; i < positions.length; ++i) {
        const entity = getEntityAt(positions[i]);

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

        let newBoard;

        const positions = state.locationSelector.locations.map(location => new Position(location));

        let editor = state.editor;

        if(action.type == "set-selected-attribute") {
            const [map, attributeEditor] = editor[action.targetType].attributeEditor.editAttribute(state.map, action.name, action.value);
            newBoard = map.initialGameState.board;

            editor = {
                ...editor,
                [action.targetType]: {
                    ...editor[action.targetType],
                    attributeEditor,
                },
            };
        }
        else if(action.type == "set-selected-entity-type") {
            const newBuilderConfig = state._builderConfig[action.targetType][action.entityType];
            const [map, attributeEditor] = editor[action.targetType].attributeEditor.changeType(state.map, action.entityType, newBuilderConfig);

            newBoard = map.initialGameState.board;

            editor = {
                ...editor,
                [action.targetType]: {
                    editable: true,
                    type: action.entityType,
                    attributeEditor,
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
        const [map, attributeEditor] = editorMetaEntity.attributeEditor.editAttribute(state.map, action.name, action.value);

        state = {
            ...state,
            map: map,
            editor: {
                ...state.editor,
                metaEntities: {
                    ...state.editor.metaEntities,
                    [action.entityName]: {
                        ...editorMetaEntity,
                        attributeEditor,
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
