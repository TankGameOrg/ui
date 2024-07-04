import Entity from "../../game/state/board/entity.js";
import { Position } from "../../game/state/board/position.js";


function determineCanPaste(board, insertPosition, clipboardWidth, clipboardHeight) {
    if(insertPosition === undefined) return false;

    return insertPosition.x + clipboardWidth <= board.width &&
        insertPosition.y + clipboardHeight <= board.height;
}


export class Clipboard {
    /**
     * Construct a clipboard from a board and a selection
     * @param {*} board The board to cut/copy from
     * @param {*} selection The locations to cut/copy
     * @param {*} lastSelected The last location that we selected (assumed to be a candiate for pasting)
     * @param {*} isCut Is this a cut operations else copy
     * @returns
     */
    static fromSelection(board, selection, lastSelected, { isCut = false } = {}) {
        let entities = [];
        let floor = [];
        let originalPositions = [];
        let minX = Infinity;
        let maxX = 0;
        let minY = Infinity;
        let maxY = 0;

        for(const location of selection) {
            const position = new Position(location);
            if(isCut) {
                originalPositions.push(position);
            }

            entities.push(board.getEntityAt(position).clone());
            floor.push(board.getFloorTileAt(position).clone());
            minX = Math.min(minX, position.x);
            minY = Math.min(minY, position.y);
            maxX = Math.max(maxX, position.x);
            maxY = Math.max(maxY, position.y);
        }

        for(let entity of entities.concat(floor)) {
            entity.position = new Position(
                entity.position.x - minX,
                entity.position.y - minY,
            );
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        return new Clipboard({
            width,
            height,
            originalPositions,
            entities,
            floor,
            lastSelected,
            isCut,
            canPaste: determineCanPaste(board, lastSelected, width, height),
        });
    }

    /**
     * Interal constructor
     * @private
     */
    constructor({ width, height, originalPositions, entities, floor, isCut, canPaste = false }) {
        this.width = width;
        this.height = height;
        this._originalPositions = originalPositions;
        this._entities = entities;
        this._floor = floor;
        this.isCut = isCut;
        this.canPaste = canPaste;
    }

    /**
     * Get the positions of the original selection that would be removed by a cut operation
     */
    getCutLocations() {
        if(this.isCut) {
            return this._originalPositions.map(position => position.humanReadable);
        }

        return [];
    }

    /**
     * Remove the entities and floor tiles that we originally selected in a cut operation
     * @private
     * @param {*} board the board to modify (does not clone)
     */
    _removeOriginal(board) {
        for(const position of this._originalPositions) {
            board.setEntity(new Entity({ type: "empty", position }));
            board.setFloorTile(new Entity({ type: "empty", position }));
        }
    }

    /**
     * Insert the clipboard's contents into a board and remove the original selection if in cut mode
     * @param {*} board The board to insert into
     * @param {*} insertPosition The top left position of the insertion
     * @returns The cloned and modified board
     */
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

                if(newBoard.isInBounds(entity.position)) {
                    setFn.call(newBoard, entity);
                }
            }
        }

        return newBoard;
    }

    /**
     * Update the instance variable canPaste based on the users current selection
     * @param {*} board The board the user is looking at
     * @param {*} insertPosition The insertion point for the paste
     * @returns A copy of the selection with the updated canPaste
     */
    updateCanPaste(board, insertPosition) {
        return new Clipboard({
            width: this.width,
            height: this.height,
            isCut: this.isCut,
            originalPositions: this._originalPositions,
            entities: this._entities,
            floor: this._floor,
            canPaste: determineCanPaste(board, insertPosition, this.width, this.height),
        });
    }

    /**
     * Check if a modification invalidates the clipboard
     * @param {*} modifyPosition The position that was modified
     * @returns true if the clipboard is invalid
     */
    doesModifyInvalidateSelection(modifyPosition) {
        // Only cut selections can be invalidated by modifying the source
        if(this.isCut) {
            return this._originalPositions.find(position => position.humanReadable == modifyPosition.humanReadable);
        }

        return false;
    }

    /**
     * Remap the originalPositions (cut) onto a new board using remapPosition and return undefined if the selection is invalidated
     * @param {*} board The board we're remapping on to
     * @param {*} insertPosition The location that the user has selected for pasting
     * @param {*} remapPosition Given an old position it returns a new position or undefined if the position is not on the new board
     */
    remapPositions(board, insertPosition, remapPosition) {
        let originalPositions = this._originalPositions.map(position => remapPosition(position));

        // If any of our positions don't map to something new the selection is invalid (cut only)
        if(this.isCut && originalPositions.filter(position => position === undefined).length > 0) {
            return;
        }

        originalPositions = originalPositions.map(position => new Position(position));

        return new Clipboard({
            width: this.width,
            height: this.height,
            isCut: this.isCut,
            originalPositions,
            // Entities and floors are already relative to the clipboard so we don't need to remap
            entities: this._entities,
            floor: this._floor,
            canPaste: determineCanPaste(board, insertPosition, this.width, this.height),
        });
    }
}

/**
 * Helper for the mapBuilderReducer that handles the copy and paste actions
 * @param {*} state The map builder state
 * @param {*} action The map builder action should be of type cut, copy or paste
 * @returns Modified map builder state or undefined if the action type is unknown
 */
export function copyPasteReducer(state, action) {
    const {board} = state.initialState;
    const lastSelected = new Position(state.locationSelector.lastSelected);

    if(action.type == "copy" || action.type == "cut") {
        if(state.locationSelector.locations?.length > 0) {
            const clipboard = Clipboard.fromSelection(board, state.locationSelector.locations, lastSelected, {
                isCut: action.type == "cut",
            });

            return {
                ...state,
                clipboard,
            };
        }
        else {
            // No selection can't cut/copy
            return state;
        }
    }

    if(action.type == "paste") {
        if(state.locationSelector.lastSelected === undefined || state.clipboard === undefined) {
            // Nothing to paste or no location to paste at
            return state;
        }
        else if(!state.clipboard.canPaste) {
            return {
                ...state,
                errorMessage: `Cowardly refusing to paste outside of the board (clipboard contents are ${state.clipboard.width} x ${state.clipboard.height})`,
            };
        }
        else {
            const newBoard = state.clipboard.paste(board, lastSelected);

            return {
                ...state,
                initialState: {
                    ...state.initialState,
                    board: newBoard,
                },
                // Only allow 1 paste after cutting
                clipboard: state.clipboard.isCut ? undefined : state.clipboard,
            };
        }
    }
}

/**
 * Helper that updates the clipboard's state after an entity or floor was modified
 * @param {*} clipboard The previous clipboard state
 * @param {*} positionsModified The locations of the entities or floor tiles that were modified
 * @returns The updated clipboard or undefined
 */
export function updateClipboardOnModify(clipboard, positionsModified) {
    if(clipboard === undefined) return;

    const isSelectionInvalidated = !!positionsModified.find(position => clipboard.doesModifyInvalidateSelection(position));
    return isSelectionInvalidated ? undefined : clipboard;
}
