/**
 * Find the differnces between two sets of keys
 *
 * Attibutes and other objects that exist in the from player set but not other player set are considered removed and the reverse are considered added.
 * @param {*} fromKeys the original keys
 * @param {*} toKeys the new keys
 * @param {*} onAdd a function returning an array of diffs created by adding key (it's first parameter)
 * @param {*} onRemove a function returning an array of diffs created by removing key (it's first parameter)
 * @param {*} onElse a function called with a key if it exists in both objects that returns an array of differences
 */
export function diffKeys({ fromKeys, toKeys, onAdd, onRemove, onElse }) {
    let differences = [];
    const combinedNames = new Set(fromKeys.concat(toKeys));
    fromKeys = new Set(fromKeys);
    toKeys = new Set(toKeys);

    for(const name of combinedNames) {
        if(!fromKeys.has(name) && toKeys.has(name)) {
            differences = differences.concat(onAdd(name));
        }
        else if(fromKeys.has(name) && !toKeys.has(name)) {
            differences = differences.concat(onRemove(name));
        }
        else {
            differences = differences.concat(onElse(name));
        }
    }

    return differences;
}

/**
 * Find the differences between to sets of objects containing a player's or entity's attributes
 * @param {*} source the source to use for attribute changes
 * @param {*} fromAttributes the original attributes
 * @param {*} toAttributes the new attirbutes
 */
export function diffAttributes(source, fromAttributes, toAttributes) {
    return diffKeys({
        fromKeys: Object.keys(fromAttributes),
        toKeys: Object.keys(toAttributes),
        onAdd: key => {
            return [new Difference({
                source,
                key,
                changeType: "added",
                payload: toAttributes[key],
            })];
        },
        onRemove: key => {
            return [new Difference({
                source,
                key,
                changeType: "removed",
            })];
        },
        onElse: key => {
            const hasMax = toAttributes[key]?.max !== undefined;
            const isDifferent = hasMax ?
                toAttributes[key].value == fromAttributes[key].value && toAttributes[key].max == fromAttributes[key].max :
                toAttributes[key] == fromAttributes[key];

            if(isDifferent) return [];

            return [new Difference({
                source,
                key,
                changeType: "updated",
                payload: {
                    from: fromAttributes[key],
                    to: toAttributes[key],
                },
            })];
        },
    });
}


export class Difference {
    /**
     * A difference between two versions of the state
     *
     * @param {*} source the part of the state that found the difference
     * @param {*} key the thing that changed
     * @param {*} changeType One of added, removed, updated
     * @param {*} payload
     */
    constructor({ source, key, changeType, payload }) {
        this.source = source;
        this.key = key;
        this.changeType = changeType;
        this.payload = payload;
    }
}

export class NamedSource {
    /**
     * Construct a basic source identified by its name
     * @param {*} name the name of the source
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Check if the given source is a named source with the given name
     * @param {*} name the name to check for
     * @param {*} source the source to check
     */
    static is(name, source) {
        return source instanceof NamedSource && source.name == name;
    }
}