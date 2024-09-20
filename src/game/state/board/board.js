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

        for(const unit of rawBoard.units) {
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
            units: Object.values(this._units),
            floor: Object.values(this._floor),
        };
    }

    _verifyPositon(position, elementsObject, type) {
        const {humanReadable} = position;

        if(elementsObject[humanReadable] != undefined && elementsObject[humanReadable].position.humanReadable != humanReadable) {
            throw new Error(`${type} at ${humanReadable} thinks it should be at ${elementsObject[humanReadable].position.humanReadable}`);
        }
    }

    getAllUnits() {
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

    getAllFloors() {
        return Object.values(this._floor);
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
}

deserializer.registerDeserializer("board-v1", (rawBoard) => {
    rawBoard = {
        ...rawBoard,
        units: rawBoard.entities,
        entities: undefined,
    };

    return Board.deserialize(rawBoard);
});

deserializer.registerClass("board-v2", Board);