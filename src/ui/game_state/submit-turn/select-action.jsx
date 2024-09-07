import { prettyifyName } from "../../../utils.js";

export function SelectAction({ actions, value, setValue }) {
    if(!actions) return;

    const showMessages = value === undefined;

    return (
        <table>
            {actions.map((action) => {
                const isAvailable = action.errors?.length === 0;

                let errors;
                if(showMessages) {
                    const description = action.description?.length > 0 ? (
                        <div className="select-action-info-row">{action.description}</div>
                    ) : undefined;

                    errors =  isAvailable ? description : (
                        <td className="select-action-info-row action-error-message">{
                            action.errors.map(error => (
                                <div key={error.toString()}>{error.toString()}</div>
                            ))
                        }</td>
                    );
                }

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