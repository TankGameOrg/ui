import { deserializer } from "../../deserialization.js";
import "./dice-log-field-spec.js";
import "./log-field-spec.js";


export class GenericPossibleAction {
    constructor({ actionName, fieldSpecs, errors }) {
        this._actionName = actionName;
        this._fieldSpecs = fieldSpecs;
        this._errors = errors;
    }

    getActionName() {
        return this._actionName;
    }

    static deserialize(rawGenericPossibleAction) {
        return new GenericPossibleAction({
            ...rawGenericPossibleAction,
            fieldSpecs: rawGenericPossibleAction.fieldSpecs,
        });
    }

    serialize() {
        return {
            actionName: this._actionName,
            fieldSpecs: this._fieldSpecs,
            errors: this._errors,
        };
    }

    isValidEntry(logEntry, context) {
        for(const parameters of this.getParameterSpec(logEntry, context)) {
            if(!parameters.isValid(logEntry[parameters.name])) {
                return false;
            }
        }

        return true;
    }

    getParameterSpec(logEntry) {
        return this._fieldSpecs;
    }

    getErrors() {
        return this._errors;
    }
}

deserializer.registerClass("generic-possible-action", GenericPossibleAction);