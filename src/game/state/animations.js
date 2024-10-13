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


function _buildElementMappings(gameState) {
    let mapping = {};
    for(const unit of gameState.board.getAllUnits()) {
        mapping[unit.playerRef?.toString?.() || unit.position.humanReadable] = unit;
    }

    return mapping;
}


/**
 * Given a previous and current state return an array of animatable changes
 * @param {*} previousState The previous state
 * @param {*} currentState The current state
 * @param {*} opts.attributesToAnimate An array of attributes who's changes we have animations for
 * @returns
 */
export function findAnimationsBetweenStates(previousState, currentState, opts = {}) {
    let animations = [];
    const previousElements = _buildElementMappings(previousState);
    const currentElements = _buildElementMappings(currentState);

    diffKeys({
        fromKeys: Object.keys(previousElements),
        toKeys: Object.keys(currentElements),
        onAdd: elementId => {
            animations.push({
                type: "spawn",
                position: currentElements[elementId].position,
                element: currentElements[elementId],
            });
        },
        onRemove: elementId => {
            animations.push({
                type: "destroy",
                position: previousElements[elementId].position,
                element: previousElements[elementId],
            });
        },
        onElse: elementId => {
            // Check if any of the attributes changed
            diffKeys({
                fromKeys: opts.attributesToAnimate.filter(key => previousElements[elementId][key] !== undefined),
                toKeys: opts.attributesToAnimate.filter(key => currentElements[elementId][key] !== undefined),
                onAdd: key => {
                    animations.push({
                        type: "add-attribute",
                        position: currentElements[elementId].position,
                        key,
                    });
                },
                onRemove: key => {
                    animations.push({
                        type: "remove-attribute",
                        position: currentElements[elementId].position,
                        key,
                    });
                },
                onElse: key => {
                    if(!isEqual(previousElements[elementId][key], currentElements[elementId][key])) {
                        const from = previousElements[elementId][key];
                        const to = currentElements[elementId][key];

                        let difference;
                        const fromValue = from?.value ?? from;
                        const toValue = to?.value ?? to;
                        if(typeof fromValue == "number" && typeof toValue == "number") {
                            difference = toValue - fromValue;
                        }

                        animations.push({
                            type: "update-attribute",
                            position: currentElements[elementId].position,
                            key,
                            from,
                            to,
                            difference,
                        });
                    }
                },
            });
        },
    });

    return animations;
}