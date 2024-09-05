import { logger } from "#platform/logging.js";
import { Position } from "../state/board/position.js";
import { ActionError } from "./action-error.js";
import { DiceLogFieldSpec } from "./dice-log-field-spec.js";
import { GenericPossibleAction } from "./generic-possible-action.js";
import { LogFieldSpec } from "./log-field-spec.js";

export class ShootActionSource {
    constructor({ diceField, getDiceForTarget, playerCanShoot }) {
        this._diceField = diceField;
        this._getDiceForTarget = getDiceForTarget;
        this._playerCanShoot = playerCanShoot;
    }

    async getActionFactoriesForPlayer({playerName, gameState, engine}) {
        // This player can't shoot nothing to do
        const player = gameState.players.getPlayerByName(playerName);
        if(!player || !this._playerCanShoot(player)) {
            return [];
        }

        let range = await engine.getLineOfSightFor(playerName);

        // Parse positions and remove invalid ones
        range = range.map(position => {
            try {
                return new Position(position);
            }
            catch(err) {
                logger.warn({
                    msg: "Recieved invalid position from engine (dropping)",
                    message: err.message,
                    position,
                });
            }
        }).filter(position => position && gameState.board.isInBounds(position));

        return [
            new GenericPossibleAction({
                actionName: "shoot",
                errors: range.length === 0 ?
                    [new ActionError({ category: "GENERIC", message: "No targets available" })] : [],
                fieldSpecs: [
                    new LogFieldSpec({
                        name: "target",
                        type: "select-position",
                        options: range.map(position => position.humanReadable),
                        nestedSpecsByValue: range.map(position => {
                            let hitFields = [];

                            const dice = this._getDiceForTarget({
                                gameState,
                                subject: playerName,
                                target: position,
                            });

                            if(dice.length > 0) {
                                hitFields = [
                                    new DiceLogFieldSpec({
                                        name: this._diceField,
                                        dice,
                                    }),
                                ];
                            }
                            else {
                                hitFields = [
                                    new LogFieldSpec({
                                        name: "hit",
                                        type: "set-value",
                                        value: true,
                                    })
                                ];
                            }

                            return [position.humanReadable, hitFields];
                        }),
                    }),
                ],
            }),
        ];
    }
}
