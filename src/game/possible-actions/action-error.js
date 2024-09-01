import { deserializer } from "../../deserialization.js";

export class ActionError {
    constructor({ category, message, expiration }) {
        this._caegory = category;
        this._message = message;
        this._expiration = expiration;
    }

    static deserialize(rawActionError) {
        return new ActionError(rawActionError);
    }

    serialize() {
        return {
            category: this._caegory,
            message: this._message,
            expiration: this._expiration,
        };
    }

    getTimeToExpiration() {
        return (this._expiration * 1000) - Date.now();
    }

    toString() {
        return this._message;
    }
}

deserializer.registerClass("action-error", ActionError);
