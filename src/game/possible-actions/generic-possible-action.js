import { logger } from "#platform/logging.js";
import { deserializer } from "../../deserialization.js";
import "./dice-log-field-spec.js";
import { DiceLogFieldSpec } from "./dice-log-field-spec.js";
import "./log-field-spec.js";


export class GenericPossibleAction {
    constructor({ actionName, fieldSpecs, errors }) {
        this._actionName = actionName;
        this._fieldSpecs = fieldSpecs;
        this._errors = errors || [];

        this._nestedSpecs = new Map();
        if(this._fieldSpecs !== undefined) {
            for(const fieldSpec of this._fieldSpecs) {
                if(fieldSpec.nestedSpecsByValue?.size > 0) {
                    this._nestedSpecs.set(fieldSpec.name, fieldSpec.nestedSpecsByValue);
                }
            }
        }
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
        const nestedSpecs = Object.keys(logEntry)
            .filter(key => this._nestedSpecs.has(key))
            .flatMap(key => this._nestedSpecs.get(key).get(logEntry[key]));

        return this._fieldSpecs.concat(nestedSpecs);
    }

    getDiceFor(fieldName, { rawLogEntry }) {
        const spec = this.getParameterSpec(rawLogEntry)
            .find(spec => spec.name == fieldName);

        if(spec instanceof DiceLogFieldSpec) {
            return spec.dice;
        }
        else {
            const msg = `Could not find dice for ${fieldName}`;
            logger.error({ msg, spec });
            throw new Error(msg);
        }
    }

    finalizeLogEntry(rawLogEntry) {
        if(rawLogEntry.hit_roll?.roll?.length > 0) {
            // If any dice hit the shot hits
            rawLogEntry.hit = !!rawLogEntry.hit_roll.roll.find(hit => hit);
        }

        if(rawLogEntry.damage_roll?.roll?.length > 0) {
            rawLogEntry.damage = rawLogEntry.damage_roll.roll.reduce((total, die) => total + die, 0);
        }

        return rawLogEntry;
    }

    getErrors() {
        return this._errors;
    }
}

deserializer.registerClass("generic-possible-action", GenericPossibleAction);