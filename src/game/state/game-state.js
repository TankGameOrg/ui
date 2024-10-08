import { deserializer } from "../../deserialization.js";
import "./board/board.js";
import "./board/element.js";

export class GameState {
    constructor(attributes = {}) {
        Object.assign(this, attributes);
    }

    static deserialize(rawGameState) {
        return new GameState(rawGameState);
    }

    serialize() {
        return {
            ...this,
        };
    }

    getElementsByPlayer(player) {
        return this.board.getAllUnits()
            .filter(element => !!element.playerRef?.isFor?.(player));
    }
}

deserializer.registerDeserializer("game-state-v1", (rawState, helpers) => {
    helpers.updatedContent();

    return GameState.deserialize({
        ...rawState,
        council: rawState.metaEntities.council,
        metaEntities: undefined,
    });
});

deserializer.registerClass("game-state-v2", GameState);