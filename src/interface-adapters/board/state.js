import { Position } from "../../game/state/board/position.js";

export function createBoard(width, height, cellInitilizer) {
    let cells = [];
    let x = 0;
    let y = 0;
    while (y < height) {
        cells.push(cellInitilizer(x, y));

        if (++x == width) {
            x = 0;
            ++y;
        }
    }

    return {
        width,
        height,
        cells,
    };
}

function getCellIndex(state, position) {
    if(position === undefined || position.x >= state.width || position.y >= state.height) {
        throw new Error(`Position is out of bounds (position = ${position}, width = ${state.width}, height = ${state.height})`);
    }

    return (position.y * state.width) + position.x;
}

function getCellPosition(state, index) {
    if(index >= state.cells.length || isNaN(index)) {
        throw new Error(`Cell index is out of bounds (index = ${index}, length = ${state.cells.length}, width = ${state.width}, height = ${state.height})`);
    }

    return new Position(
        index % state.width,
        Math.floor(index / state.width));
}

export function getCell(state, position) {
    return state.cells[getCellIndex(state, position)];
}

export function modifyCell(state, position, modifyCell) {
    const { cells } = state;
    const index = getCellIndex(state, position);

    return {
        ...state,
        cells: [
            ...cells.slice(0, index),
            modifyCell(cells[index], position),
            ...cells.slice(index + 1),
        ]
    };
}

export function modifyAllCells(state, modifyCell) {
    return {
        ...state,
        cells: state.cells.map((cell, index) => modifyCell(cell, getCellPosition(state, index))),
    };
}

export function getSelected(state) {
    let selections = [];
    for(let i = 0; i < state.cells.length; ++i) {
        if(state.cells[i].isSelected) {
            selections.push(getCellPosition(state, i));
        }
    }

    return selections;
}

export function modifyCellsFromList(state, { list, modifyCellInList, modifyOtherCell }) {
    const targetCells = new Set(list.map(position => getCellIndex(state, position)));

    return {
        ...state,
        cells: state.cells.map((cell, index) => {
            const modifyCell = targetCells.has(index) ? modifyCellInList : modifyOtherCell;
            if(modifyCell !== undefined) {
                return modifyCell(cell, getCellPosition(state, index));
            }

            return cell;
        }),
    };
}