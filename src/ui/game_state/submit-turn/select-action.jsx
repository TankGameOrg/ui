import { prettyifyName } from "../../../utils";

export function SelectAction({ actions, value, setValue }) {
    if(!actions) return;

    const showErrors = value === undefined;

    return (
        <table>
            {actions.map((action) => {
                const isAvailable = action.errors?.length === 0;

                let errors = showErrors && !isAvailable ? (
                    <td className="select-action-errors-row">{
                        action.errors.map(error => (
                            <div key={error.toString()}>{error.toString()}</div>
                        ))
                    }</td>
                ) : undefined;

                return (
                    <tr key={action.name}>
                        <td>
                            <ActionRadioButton
                                action={action}
                                value={value}
                                setValue={setValue}></ActionRadioButton>
                        </td>
                        {errors}
                    </tr>
                );
            })}
        </table>
    );
}

function ActionRadioButton({ action, value, setValue }) {
    const isAvailable = action.errors.length === 0;

    return (
        <div className="radio-button-wrapper">
            <label>
                <input type="radio" value={action.name} onChange={() => setValue(action.name)} checked={action.name == value} disabled={!isAvailable}/>
                <span className={isAvailable ? "" : "unavailable-action"}>{prettyifyName(action.name)}</span>
            </label>
        </div>
    );
}