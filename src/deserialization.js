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
        return JSON.stringify(object, this._transform.bind(this, "serialize"), prettyPrint ? 4 : 0);
    }

    /**
     * Convert a json string to an object
     * @param {*} jsonString the json string to parse
     * @returns the parsed object
     */
    deserialize(jsonString) {
        return JSON.parse(jsonString, this._transform.bind(this, "deserialize"));
    }

    /**
     * Transform an object to or from a json friendly object
     * @param {*} operation the operation "serialize" or "deserialize"
     * @param {*} key the key of value to transform
     * @param {*} value the value to transform
     * @returns
     */
    _transform(operation, key, value) {
        const {transformerMap, srcKey, destKey} = {
            serialize: {
                transformerMap: this._serializers,
                srcKey: SERIALIZER_KEY,
                destKey: DESERIALIZER_KEY,
            },
            deserialize: {
                transformerMap: this._deserializers,
                srcKey: DESERIALIZER_KEY,
                destKey: SERIALIZER_KEY,
            },
        }[operation];

        if(typeof value != "object" || typeof value[srcKey] != "string") {
            return value;
        }

        const className = value[srcKey];
        const transformer = transformerMap.get(className);
        if(transformer === undefined) {
            throw new Error(`Could not find a ${operation}r for ${value[srcKey]}`);
        }

        let transformed = transformer(value);

        if(transformed[destKey] === undefined) {
            throw new Error(`${operation}r for ${className} failed to set ${destKey.toString()} (key = ${key})`);
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