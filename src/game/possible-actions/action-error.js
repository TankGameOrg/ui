import { deserializer } from "../../deserialization.js";

export class ActionError {
    constructor({ category, message }) {
        this._caegory = category;
        this._message = message;
    }

    static deserialize(rawActionError) {
        return new ActionError(rawActionError);
    }

    serialize() {
        return {
            category: this._caegory,
            message: this._message,
        };
    }

    toString() {
        return this._message;
    }
}

deserializer.registerClass("action-error", ActionError);
