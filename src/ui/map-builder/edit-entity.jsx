import "./edit-entity.css";
import { setMetaEntityAttibute, setSelectedAttibute, setSelectedEntityType } from "../../interface-adapters/map-builder/map-builder.js";
import { prettyifyName } from "../../utils.js";
import { KEY_S } from "../generic/global-keybinds.js";

// Stop propagation of ctrl+x,c,v key presses inside editor
function filterKeyBinds(e) {
    if(!e.ctrlKey || e.keyCode != KEY_S) e.stopPropagation();
}

export function EditSpace({ mapBuilderState, dispatch, builderConfig }) {
    return (
        <>
            <h2>Entity</h2>
            <EditEntity dispatch={dispatch} targetType="entity" mapBuilderState={mapBuilderState} builderConfig={builderConfig}></EditEntity>
            <h2>Floor</h2>
            <EditEntity dispatch={dispatch} targetType="floorTile" mapBuilderState={mapBuilderState} builderConfig={builderConfig}></EditEntity>
        </>
    );
}

function EditEntity({ dispatch, targetType, mapBuilderState, builderConfig }) {
    const selectEntityType = e => {
        dispatch(setSelectedEntityType(targetType, e.target.value));
    };

    const {editable, type, attributes, attributeErrors} = mapBuilderState?.editor?.[targetType] || {};
    if(!editable) {
        return (
            <p>Select one or more {prettyifyName(targetType, { capitalize: false, plural: true })} that have the same type and attributes to edit</p>
        );
    }

    const entityBuilderConfig = builderConfig?.[targetType]?.[type];

    const updateAttribute = (attributeName, value) => {
        dispatch(setSelectedAttibute(targetType, attributeName, value));
    };

    return (
        <div onKeyDown={filterKeyBinds}>
            <select value={type} onChange={selectEntityType}>
                <option key="empty" value="empty">Empty</option>
                {mapBuilderState[`${targetType}Types`].map(type => {
                    return (
                        <option key={type} value={type}>{prettyifyName(type)}</option>
                    );
                })}
            </select>
            <EditAttributes
                attributes={attributes}
                updateAttribute={updateAttribute}
                attributeErrors={attributeErrors}
                attributeBuilderConfig={entityBuilderConfig?.attributes}></EditAttributes>
        </div>
    );
}

function EditAttributes({ attributes, updateAttribute, attributeErrors, attributeBuilderConfig }) {
    return (
        <>
            {Object.keys(attributes).map(attributeName => {
                const description = attributeBuilderConfig?.[attributeName]?.description;
                const errorMessage = attributeErrors[attributeName];
                const value = attributes[attributeName];
                const hasMax = value?.value !== undefined && value?.max !== undefined;

                const onInput = hasMax ?
                    (key, e) => updateAttribute(attributeName, { ...value, [key]: e.target.value }) :
                    e => updateAttribute(attributeName, e.target.value);

                let editor = <input value={value} onInput={onInput}/>;
                if(hasMax) {
                    editor = (
                        <div>
                            <input value={value.value} onInput={e => onInput("value", e)} style={{ width: "100px" }}/>
                            <span> / </span>
                            <input value={value.max} onInput={e => onInput("max", e)} style={{ width: "100px" }}/>
                        </div>
                    );
                }

                return (
                    <label key={attributeName} className={errorMessage === undefined ? "" : "edit-entity-field-error"}>
                        <h4>{prettyifyName(attributeName)}</h4>
                        {description !== undefined ? <div>{description}</div> : undefined}
                        {editor}
                        {errorMessage ? <div className="edit-entity-error-message">{errorMessage}</div> : undefined}
                    </label>
                );
            })}
        </>
    );
}

export function MetaEntityEditor({ mapBuilderState, dispatch, builderConfig }) {
    const {metaEntities} = mapBuilderState.editor;

    return (
        <>
            {Object.keys(metaEntities).map((metaEntityName) => {
                const {name, type, attributes, attributeErrors} = metaEntities[metaEntityName];
                const entityBuilderConfig = builderConfig?.metaEntities?.[type];

                const updateAttribute = (attributeName, value) => {
                    dispatch(setMetaEntityAttibute(name, attributeName, value));
                };

                return (
                    <div key={name}>
                        <h2>{prettyifyName(name)}</h2>
                        <EditAttributes
                            attributes={attributes}
                            attributeBuilderConfig={entityBuilderConfig?.attributes}
                            attributeErrors={attributeErrors}
                            updateAttribute={updateAttribute}></EditAttributes>
                    </div>
                );
            })}
        </>
    )
}
