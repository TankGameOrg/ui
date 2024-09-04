import { GenericPossibleAction } from "../../game/possible-actions/generic-possible-action.js";
import { LogFieldSpec } from "../../game/possible-actions/log-field-spec.js";
import { Position } from "../../game/state/board/position.js";
import { ActionError } from "../../game/possible-actions/action-error.js";

export class JavaEngineSource {
    constructor({ actionsToSkip = [] } = {}) {
        this._actionsToSkip = new Set(actionsToSkip);
    }

    async getActionFactoriesForPlayer({playerName, gameState, engine}) {
        const player = gameState.players.getPlayerByName(playerName);
        if(!player) return [];

        let playerToRequest = playerName;
        if(!engine._isMainBranch) {
            const isCouncil = ["senator", "councilor"].includes(player.type);
            if(isCouncil) {
                playerToRequest = "Council";
            }
        }

        const possibleActions = await engine.getPossibleActions(playerToRequest);

        return possibleActions.map(possibleAction => {
            const actionName = possibleAction.rule;

            // This action will be handled by another factory
            if(this._actionsToSkip.has(actionName)) return;

            let {fieldSpecs, errors} = this._buildFieldSpecs(possibleAction.fields);

            errors = errors.concat(possibleAction.errors.map(error => new ActionError(error)));

            return new GenericPossibleAction({
                errors,
                subject: playerName,
                actionName: actionName,
                fieldSpecs,
            });
        })

        // Remove any actions that can never be taken
        .filter(possibleAction => possibleAction !== undefined);
    }

    _getPositionFromJava(tank) {
        return new Position(tank.$POSITION !== undefined ? tank.$POSITION : tank.position);
    }

    _buildFieldSpecs(fields) {
        let errors = [];
        let fieldSpecs = fields.map(field => {
            // EnumeratedLogFieldSpec
            if(field.options !== undefined) {
                const {spec, error} = this._buildEnumeratedFieldSpec(field);
                if(error !== undefined) {
                    errors.push(error);
                    return;
                }

                return spec;
            }

            throw new Error("Engine gave us an invalid LogFieldSpec");
        });

        if(errors.length > 0) {
            fieldSpecs = [];
        }

        return {fieldSpecs, errors};
    }

    _buildEnumeratedFieldSpec(field) {
        // No possible inputs for this action
        if(field.options?.length === 0) {
            return {
                error: new ActionError({
                    category: "INVALID_DATA",
                    message: `There are not valid options for '${field.field_name}'`
                })
            };
        }

        let type = "select";
        let options;
        switch(field.data_type) {
            case "Position":
                type = "select-position";
                options = field.options.map(option => new Position(option.value).humanReadable);
                break;

            case "PlayerRef":
                options = field.options.map(option => {
                    return {
                        display: option.pretty_name,
                        value: option.value.name,
                    };
                });
                break;

            // Any native JSON data type
            case undefined:
                options = field.options.map(option => ({
                    display: option.pretty_name,
                    value: option.value,
                }));
                break;

            default:
                throw new Error(`Unsupported data type: ${field.data_type}`);
        }

        return {
            spec: new LogFieldSpec({
                name: field.field_name,
                type,
                options,
            }),
        };
    }
}
