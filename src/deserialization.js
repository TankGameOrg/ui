import { logger } from "#platform/logging.js";

export const SERIALIZER_KEY = Symbol("serializer");
export const DESERIALIZER_KEY = "class";

/**
 * A helper for serializing and deserializing classes to JSON
 */
export class Deserializer {
    constructor() {
        this._deserializers = new Map();
        this._serializers = new Map();
    }

    /**
     * Serialize an object
     * @param {*} object the object to serialize
     * @param {*} prettyPrint whether to put spaces in to make the json more human readable
     * @returns the json string
     */
    serialize(object, { prettyPrint } = {}) {
        return JSON.stringify(object, this._serialize.bind(this), prettyPrint ? 4 : 0);
    }

    /**
     * Convert a json string to an object
     * @param {*} jsonString the json string to parse
     * @returns the parsed object
     */
    deserialize(jsonString) {
        return JSON.parse(jsonString, this._deserialize.bind(this));
    }

    _serialize(key, value) {
        if(typeof value != "object" || typeof value[SERIALIZER_KEY] != "string") {
            return value;
        }

        const className = value[SERIALIZER_KEY];
        const transformer = this._serializers.get(className);
        if(transformer === undefined) {
            throw new Error(`Could not find a serializer for ${value[SERIALIZER_KEY]}`);
        }

        let serialized = transformer(value);
        if(serialized[DESERIALIZER_KEY] === undefined) {
            serialized[DESERIALIZER_KEY] = className;
        }

        return serialized;
    }

    _deserialize(key, value) {
        if(typeof value != "object" || typeof value[DESERIALIZER_KEY] != "string") {
            return value;
        }

        const className = value[DESERIALIZER_KEY];
        const transformer = this._deserializers.get(className);
        if(transformer === undefined) {
            throw new Error(`Could not find a deserializer for ${value[DESERIALIZER_KEY]}`);
        }

        let transformed = transformer(value);

        if(transformed[SERIALIZER_KEY] === undefined) {
            throw new Error(`Deserializer for ${className} failed to set ${SERIALIZER_KEY.toString()} (key = ${key})`);
        }

        return transformed;
    }

    /**
     * Register a class with serialize and deserialize methods (can be used as a decorator)
     * @param {*} className the name used to identify this class for serialization and deserialization
     * @param {*} Class the class to register
     * @returns
     */
    registerClass(className, Class) {
        if(Class === undefined) {
            return this.registerClass.bind(this, className);
        }

        Class.prototype[SERIALIZER_KEY] = className;
        this.registerSerializer(className, Class.serialize || (object => Class.prototype.serialize.call(object)));
        this.registerDeserializer(className, Class.deserialize)
    }

    /**
     * Register a function for serializing a class (can be used as a decorator)
     * @param {*} className the name used to identify this class for serialization and deserialization
     * @param {*} serializer a function that converts an instance into a json friendly object
     * @returns
     */
    registerSerializer(className, serializer) {
        if(serializer === undefined) {
            return this.registerClass.bind(this, className);
        }

        this._serializers.set(className, serializer);
    }

    /**
     * Register a function for deserializing a class (can be used as a decorator)
     * @param {*} className the name used to identify this class for serialization and deserialization
     * @param {*} deserializer a function that converts from a json friendly object an instance
     * @returns
     */
    registerDeserializer(className, deserializer) {
        if(deserializer === undefined) {
            return this.registerClass.bind(this, className);
        }

        this._deserializers.set(className, deserializer);
    }
}

/**
 * Global deserializer used for files, game state, and possible actions
 */
export let deserializer = new Deserializer();