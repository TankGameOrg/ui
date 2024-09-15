import { deserializer } from "../../../deserialization.js";
import Element from "./element.js";
import { Position } from "./position.js";

export default class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this._units = {};
        this._floor = {};
    }

    static deserialize(rawBoard) {
        let board = new Board(rawBoard.width, rawBoard.height);

        for(const unit of rawBoard.entities) {
            board.setUnit(unit);
        }

        for(const floorTile of rawBoard.floor) {
            board.setFloorTile(floorTile);
        }

        return board;
    }

    serialize() {
        return {
            width: this.width,
            height: this.height,
            entities: Object.values(this._units),
            floor: Object.values(this._floor),
        };
    }

    clone() {
        let clone = new Board(this.width, this.height);
        Object.assign(clone._units, this._units);
        Object.assign(clone._floor, this._floor);
        return clone;
    }

    _verifyPositon(position, entitiesObject, type) {
        const {humanReadable} = position;

        if(entitiesObject[humanReadable] != undefined && entitiesObject[humanReadable].position.humanReadable != humanReadable) {
            throw new Error(`${type} at ${humanReadable} thinks it should be at ${entitiesObject[humanReadable].position.humanReadable}`);
        }
    }

    getAllEntities() {
        return Object.values(this._units);
    }

    getUnitAt(position) {
        this._verifyPositon(position, this._units, "Element");
        return this._units[position.humanReadable] || (new Element({ type: "empty",  position }));
    }

    setUnit(unit) {
        if(!this.isInBounds(unit.position)) {
            throw new Error(`Can not set unit ${unit.type} to position ${unit.position.humanReadable} which is outside the bounds of this board ${this.width}x${this.height}`);
        }

        if(unit.type == "empty") {
            delete this._units[unit.position.humanReadable];
        }
        else {
            this._units[unit.position.humanReadable] = unit;
        }
    }

    getFloorTileAt(position) {
        this._verifyPositon(position, this._floor, "Floor tile");
        return this._floor[position.humanReadable] || (new Element({ type: "empty", position }));
    }

    setFloorTile(tile) {
        if(!this.isInBounds(tile.position)) {
            throw new Error(`Can not set floor tile ${tile.type} to position ${tile.position.humanReadable} which is outside the bounds of this board ${this.width}x${this.height}`);
        }

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

    cloneAndResize({ left = 0, right = 0, top = 0, bottom = 0 } = {}) {
        const newWidth = this.width + left + right;
        const newHeight = this.height + top + bottom;
        let newBoard = new Board(newWidth, newHeight);

        const boardLayers = [
            ["unit", this._units],
            ["floorTile", this._floor],
        ];

        for(const [targetType, targets] of boardLayers) {
            for(const element of Object.values(targets)) {
                const newX = element.position.x + left;
                const newY = element.position.y + top;

                if(0 <= newX && newX < newWidth && 0 <= newY && newY < newHeight) {
                    let newElement = element.clone();
                    newElement.position = new Position(newX, newY);

                    if(targetType == "unit") {
                        newBoard.setUnit(newElement);
                    }
                    else {
                        newBoard.setFloorTile(newElement);
                    }
                }
            }
        }

        return newBoard;
    }
}

deserializer.registerClass("board-v1", Board);