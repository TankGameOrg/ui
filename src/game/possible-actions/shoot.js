import { logger } from "#platform/logging.js";
import { deserializer } from "../../deserialization.js";
import { Position } from "../state/board/position.js";
import { DiceLogFieldSpec } from "./dice-log-field-spec.js";
import { Dice } from "./die.js";
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
            new ShootAction({
                diceField: this._diceField,
                targets: range.map(position => {
                    position = position.humanReadable;

                    const dice = this._getDiceForTarget({
                        gameState,
                        subject: playerName,
                        target: position,
                    });

                    return {
                        position,
                        dice,
                    };
                })
            }),
        ];
    }
}

export class ShootAction extends GenericPossibleAction {
    constructor({ targets, diceField }) {
        super({ actionName: "shoot", type: "shoot" });
        this._targets = targets;
        this._diceField = diceField;

        this._diceToRoll = {};
        for(const target of targets) {
            this._diceToRoll[target.position] = target.dice;
        }
    }

    static deserialize(rawShootAction) {
        return new ShootAction({
            targets: rawShootAction.targets,
            diceField: rawShootAction.diceField,
        });
    }

    serialize() {
        return {
            targets: this._targets,
            diceField: this._diceField,
        };
    }

    getParameterSpec(logEntry) {
        const targetSpec = new LogFieldSpec({
            name: "target",
            type: "select-position",
            options: this._targets.map(target => target.position),
        });

        let hitFields = [];
        if(logEntry.target) {
            const dice = this._diceToRoll[logEntry.target];

            if(dice.length > 0) {
                if(this._diceField === undefined) {
                    throw new Error("Not set");
                }

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
        }

        return [targetSpec, ...hitFields];
    }

    getDiceFor(fieldName, { rawLogEntry }) {
        return this._diceToRoll[rawLogEntry.target];
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
}

deserializer.registerClass("shoot-action", ShootAction);