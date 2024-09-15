import { GenericPossibleAction } from "../../game/possible-actions/generic-possible-action.js";
import { LogFieldSpec } from "../../game/possible-actions/log-field-spec.js";
import { Position } from "../../game/state/board/position.js";
import { ActionError } from "../../game/possible-actions/action-error.js";
import { logger } from "#platform/logging.js";
import { Dice, Die } from "../../game/possible-actions/die.js";
import { DiceLogFieldSpec } from "../../game/possible-actions/dice-log-field-spec.js";

export class JavaEngineSource {
    constructor({ actionsToSkip = [] } = {}) {
        this._actionsToSkip = new Set(actionsToSkip);
    }

    async getActionFactoriesForPlayer({playerName, gameState, engine}) {
        const player = gameState.players.getPlayerByName(playerName);
        if(!player) return [];

        const possibleActions = await engine.getPossibleActions(playerName);

        return possibleActions.map(possibleAction => {
            const actionName = possibleAction.rule;

            // This action will be handled by another factory
            if(this._actionsToSkip.has(actionName)) return;

            let {fieldSpecs, errors} = this._buildFieldSpecs(possibleAction.fields, gameState);

            errors = errors.concat(possibleAction.errors.map(error => new ActionError(error)));

            return new GenericPossibleAction({
                description: possibleAction.description,
                errors,
                subject: playerName,
                actionName: actionName,
                fieldSpecs,
            });
        })

        // Remove any actions that can never be taken
        .filter(possibleAction => possibleAction !== undefined);
    }

    _buildFieldSpecs(fields, gameState) {
        let errors = [];
        let fieldSpecs = fields.map(field => {
            // EnumeratedLogFieldSpec
            if(field.options !== undefined) {
                const {spec, error} = this._buildEnumeratedFieldSpec(field, gameState);
                if(error !== undefined) {
                    errors.push(error);
                    return;
                }

                return spec;
            }

            if(field.dice !== undefined) {
                const dice = field.dice.map((diceSet) => {
                    const die = new Die({
                        name: diceSet.die.name,
                        sides: diceSet.die.sides,
                    });

                    return new Dice(diceSet.num_dice, die);
                });

                return new DiceLogFieldSpec({
                    name: field.field_name,
                    description: field.description,
                    dice,
                });
            }

            throw new Error("Engine gave us an invalid LogFieldSpec");
        });

        if(errors.length > 0) {
            fieldSpecs = [];
        }

        return {fieldSpecs, errors};
    }

    _buildEnumeratedFieldSpec(field, gameState) {
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
        let playerPositions;
        switch(field.data_type) {
            case "Position":
                type = "select-position";
                options = field.options.map(option => new Position(option.value).humanReadable);
                break;

            case "PlayerRef":
                // If all of our players exist on the board use the position selector instead of the regular select
                playerPositions = field.options.map(option => {
                    const player = gameState.players.getPlayerByName(option.value.name);
                    if(!player) {
                        throw new Error(`${option.value.name} is not the name of a known player`);
                    }

                    const entities = gameState.getEntitiesByPlayer(player)
                        .filter(element => element.position !== undefined);

                    if(entities.length > 0) {
                        return {
                            position: entities[0].position.humanReadable,
                            value: player.name,
                        };
                    }
                });

                if(playerPositions.find(position => position === undefined)) {
                    options = field.options.map(option => {
                        return {
                            display: option.pretty_name,
                            value: option.value.name,
                        };
                    });
                }
                else {
                    type = "select-position";
                    options = playerPositions;
                }
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

        // Assumption the indexes in field.options and options point to the same value
        const nestedSpecsByValue = field.options
            .filter(option => option.nested_fields !== undefined)
            .map((option, index) => {
                const {fieldSpecs, errors} = this._buildFieldSpecs(option.nested_fields, gameState);
                if(errors?.length > 0) {
                    logger.error({
                        msg: "Errors in nested specs are not supported",
                        field,
                        errors,
                    });

                    throw new Error("Errors in nested specs are not supported");
                }

                return [options[index], fieldSpecs];
            });

        return {
            spec: new LogFieldSpec({
                name: field.field_name,
                description: field.description,
                type,
                options,
                nestedSpecsByValue,
            }),
        };
    }
}
