import Entity from "../../game/state/board/entity.js";
import { Position } from "../../game/state/board/position.js";


export class Clipboard {
    constructor(board, selection, { isCut = false } = {}) {
        this.isCut = isCut;
        this._entities = [];
        this._floor = [];
        this._originalPositions = [];
        let minX = Infinity;
        let maxX = 0;
        let minY = Infinity;
        let maxY = 0;

        for(const location of selection) {
            const position = new Position(location);
            if(isCut) {
                this._originalPositions.push(position);
            }

            this._entities.push(board.getEntityAt(position).clone());
            this._floor.push(board.getFloorTileAt(position).clone());
            minX = Math.min(minX, position.x);
            minY = Math.min(minY, position.y);
            maxX = Math.max(maxX, position.x);
            maxY = Math.max(maxY, position.y);
        }

        for(let entity of this._entities.concat(this._floor)) {
            entity.position = new Position(
                entity.position.x - minX,
                entity.position.y - minY,
            );
        }

        this.width = maxX - minX + 1;
        this.height = maxY - minY + 1;
    }

    _removeOriginal(board) {
        for(const position of this._originalPositions) {
            board.setEntity(new Entity({ type: "empty", position }));
            board.setFloorTile(new Entity({ type: "empty", position }));
        }
    }

    paste(board, insertPosition) {
        let newBoard = board.clone();

        if(this.isCut) this._removeOriginal(newBoard);

        for(const [entityList, setFn] of [[this._entities, board.setEntity], [this._floor, newBoard.setFloorTile]]) {
            for(let entity of entityList) {
                entity = entity.clone();
                entity.position = new Position(
                    entity.position.x + insertPosition.x,
                    entity.position.y + insertPosition.y,
                );

                setFn.call(newBoard, entity);
            }
        }

        return newBoard;
    }

    canPasteAt(board, insertPosition) {
        return insertPosition.x + this.width <= board.width &&
            insertPosition.y + this.height <= board.height;
    }
}