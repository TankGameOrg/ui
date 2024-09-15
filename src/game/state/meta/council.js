import { deserializer } from "../../../deserialization.js";

export class Council {
    constructor(attributes = {}) {
        Object.assign(this, attributes);
        this.attributes = {}; // TODO: Deprecate attributes
    }

    static deserialize(rawCouncil) {
        return new Council(rawCouncil);
    }

    serialize() {
        return this;
    }
}

deserializer.registerClass("council", Council);
