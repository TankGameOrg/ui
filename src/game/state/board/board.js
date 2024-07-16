import { logger } from "#platform/logging.js";
import { Difference, diffKeys } from "../diff-utils.js";
import Entity from "./entity.js";
import { Position } from "./position.js";

export default class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._entities = {};
        this._floor = {};
    }

    static deserialize(rawBoard, players) {
        let board = new Board(rawBoard.width, rawBoard.height);

        for(const rawEntry of rawBoard.entities) {
            board.setEntity(Entity.deserialize(rawEntry, players));
        }

        for(const rawFloorTile of rawBoard.floor) {
            board.setFloorTile(Entity.deserialize(rawFloorTile, players));
        }

        return board;
    }

    serialize() {
        return {
            width: this.width,
            height: this.height,
            entities: Object.values(this._entities).map(entity => entity.serialize()),
            floor: Object.values(this._floor).map(tile => tile.serialize()),
        };
    }

    _verifyPositon(position, entitiesObject, type) {
        const {humanReadable} = position;

        if(entitiesObject[humanReadable] != undefined && entitiesObject[humanReadable].position.humanReadable != humanReadable) {
            throw new Error(`${type} at ${humanReadable} thinks it should be at ${entitiesObject[humanReadable].position.humanReadable}`);
        }
    }

    getEntityAt(position) {
        this._verifyPositon(position, this._entities, "Entity");
        return this._entities[position.humanReadable] || (new Entity({ type: "empty", position }));
    }

    setEntity(entity) {
        if(entity.type == "empty") {
            delete this._entities[entity.position.humanReadable];
        }
        else {
            this._entities[entity.position.humanReadable] = entity;
        }
    }

    getFloorTileAt(position) {
        this._verifyPositon(position, this._floor, "Floor tile");
        return this._floor[position.humanReadable] || (new Entity({ type: "empty", position }));
    }

    setFloorTile(tile) {
        if(tile.type == "empty") {
            delete this._floor[tile.position.humanReadable];
        }
        else {
            this._floor[tile.position.humanReadable] = tile;
        }
    }

    isInBounds(position) {
        return position.x < this.width && position.y < this.height;
    }

    getAllEntities() {
        return Object.values(this._entities);
    }

    difference(otherBoard) {
        return this._differenceOnLevel("unit", otherBoard)
            .concat(this._differenceOnLevel("floor", otherBoard));
    }

    _differenceOnLevel(levelName, otherBoard) {
        // To be able to track moving entities we give some entities a unique ID that doesn't change across moves.
        // We start by diffing all entities with IDs and then we diff the rest of the entities with the assumption
        // that they don't move.
        const thisIdEntities = this._getEntityIdMap(levelName);
        const otherIdEntities = otherBoard._getEntityIdMap(levelName);

        let differences = diffKeys({
            fromKeys: Object.keys(thisIdEntities),
            toKeys: Object.keys(otherIdEntities),
            onAdd: uniqueId => {
                const entity = otherIdEntities[uniqueId];
                return [new Difference({
                    source: new BoardSource(uniqueId, levelName),
                    changeType: "added",
                    payload: entity,
                })];
            },
            onRemove: uniqueId => {
                return [new Difference({
                    source: new BoardSource(uniqueId, levelName),
                    changeType: "removed",
                })];
            },
            onElse: uniqueId => {
                const {position} = thisIdEntities[uniqueId];
                const source = new BoardSource(uniqueId, levelName);

                let differences = thisIdEntities[uniqueId].difference(otherIdEntities[uniqueId], source);

                if(position.humanReadable != otherIdEntities[uniqueId].position.humanReadable) {
                    differences.push(new Difference({
                        source,
                        changeType: "updated",
                        key: "positon",
                        payload: {
                            from: thisIdEntities[uniqueId].position,
                            to: otherIdEntities[uniqueId].position,
                        },
                    }));
                }

                return differences;
            },
        });

        const thisIdLocations = new Set(Object.values(thisIdEntities).map(entity => entity.position.humanReadable));
        const otherIdLocations = new Set(Object.values(otherIdEntities).map(entity => entity.position.humanReadable));

        const thisLevel = this[levelName == "unit" ? "_entities" : "_floor"];
        const otherLevel = otherBoard[levelName == "unit" ? "_entities" : "_floor"];

        const thisLocations = Object.keys(thisLevel).filter(location => !thisIdLocations.has(location));
        const otherLocations = Object.keys(otherLevel).filter(location => !otherIdLocations.has(location));

        differences = differences.concat(diffKeys({
            fromKeys: thisLocations,
            toKeys: otherLocations,
            onAdd: location => {
                return [new Difference({
                    source: new BoardSource(new Position(location), levelName),
                    changeType: "added",
                    payload: thisLevel[location],
                })];
            },
            onRemove: location => {
                return [new Difference({
                    source: new BoardSource(new Position(location), levelName),
                    changeType: "removed",
                })];
            },
            onElse: location => {
                const source = new BoardSource(new Position(location), levelName);
                return thisLevel[location].difference(otherLevel[location], source);
            },
        }));

        return differences;
    }

    /**
     * Get an object mapping unique id -> entity for all entities in the level
     * @param {*} levelName the level of the board (unit or floor) to get the id map for
     */
    _getEntityIdMap(levelName) {
        const thisLevel = this[levelName == "unit" ? "_entities" : "_floor"];
        let idMap = {};

        for(const entity of Object.values(thisLevel)) {
            const id = entity.getUniqueId();
            if(id !== undefined) {
                if(idMap[id] !== undefined) {
                    throw new Error(`Dupicate entity ID ${id} (entity1 = ${idMap[id]}, entity2 = ${entity})`);
                }

                idMap[id] = entity;
            }
        }

        return idMap;
    }
}


export class BoardSource {
    /**
     * A source representing a location on the board
     * @param {*} id the unique id of the entity or it's position if it doesn't have one
     * @param {*} level the level either "unit" or "floor"
     */
    constructor(id, level) {
        this.id = id;
        this.level = level;
    }
}