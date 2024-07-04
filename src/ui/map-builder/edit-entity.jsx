import "./edit-entity.css";
import { setSelectedAttibute, setSelectedEntityType } from "../../interface-adapters/map-builder/map-builder.js";
import { prettyifyName } from "../../utils.js";

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

    // Stop propagation to keep key presses inside the editor from reaching the global key bindings
    return (
        <div onKeyDown={e => e.stopPropagation()}>
            <select value={type} onChange={selectEntityType}>
                <option key="empty" value="empty">Empty</option>
                {mapBuilderState[`${targetType}Types`].map(type => {
                    return (
                        <option key={type} value={type}>{prettyifyName(type)}</option>
                    );
                })}
            </select>
            {Object.keys(attributes).map(attributeName => {
                const updateAttribute = e => {
                    dispatch(setSelectedAttibute(targetType, attributeName, e.target.value));
                };

                const description = entityBuilderConfig?.attributes?.[attributeName]?.description;
                const errorMessage = attributeErrors[attributeName];

                return (
                    <label key={attributeName} className={errorMessage === undefined ? "" : "edit-entity-field-error"}>
                        <h4>{prettyifyName(attributeName)}</h4>
                        {description !== undefined ? <div>{description}</div> : undefined}
                        <input value={attributes[attributeName]} onInput={updateAttribute}/>
                        {errorMessage ? <div className="edit-entity-error-message">{errorMessage}</div> : undefined}
                    </label>
                );
            })}
        </div>
    );
}