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

    getPlayerRefs() {
        return this.councilors.concat(this.senators);
    }
}

deserializer.registerClass("council", Council);
