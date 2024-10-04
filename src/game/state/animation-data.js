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
function diffKeys({ fromKeys, toKeys, onAdd, onRemove, onElse }) {
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

function isEqual(objectA, objectB) {
    if(objectA?.max !== undefined) {
        return objectA.value === objectB?.value &&
            objectA.max === objectB.max;
    }

    return objectA?.equals !== undefined ?
        objectA.equals(objectB) :
        objectA === objectB;
}


export class AnimationData {
    constructor() {
        this._animationsByPosition = {};
    }

    addAnimation(position, animation) {
        if(this._animationsByPosition[position.humanReadable] === undefined) {
            this._animationsByPosition[position.humanReadable] = [];
        }

        this._animationsByPosition[position.humanReadable].push(animation);
    }

    getAnimationsByPosition(position) {
        return this._animationsByPosition[position.humanReadable] || [];
    }
}


function _buildElementMappings(gameState) {
    let mapping = {};
    for(const unit of gameState.board.getAllUnits()) {
        mapping[unit.playerRef?.toString?.() || unit.position.humanReadable] = unit;
    }

    return mapping;
}


export function addAnimationsBetweenStates(animationData, previousState, currentState, opts = {}) {
    const previousElements = _buildElementMappings(previousState);
    const currentElements = _buildElementMappings(currentState);

    diffKeys({
        fromKeys: Object.keys(previousElements),
        toKeys: Object.keys(currentElements),
        onAdd: elementId => {
            animationData.addAnimation(currentElements[elementId].position, {
                type: "spawn",
                element: currentElements[elementId],
            });
        },
        onRemove: elementId => {
            animationData.addAnimation(previousElements[elementId].position, {
                type: "destroy",
                element: previousElements[elementId],
            });
        },
        onElse: elementId => {
            // Check if any of the attributes changed
            diffKeys({
                fromKeys: opts.attributesToAnimate.filter(key => previousElements[elementId][key] !== undefined),
                toKeys: opts.attributesToAnimate.filter(key => currentElements[elementId][key] !== undefined),
                onAdd: key => {
                    animationData.addAnimation(currentElements[elementId].position, {
                        type: "add-attribute",
                        key,
                    });
                },
                onRemove: key => {
                    animationData.addAnimation(currentElements[elementId].position, {
                        type: "remove-attribute",
                        key,
                    });
                },
                onElse: key => {
                    if(!isEqual(previousElements[elementId][key], currentElements[elementId][key])) {
                        animationData.addAnimation(currentElements[elementId].position, {
                            type: "update-attribute",
                            key,
                            from: previousElements[elementId][key],
                            to: currentElements[elementId][key],
                        });
                    }
                },
            });
        },
    });
}