import { Position } from "../../game/state/board/position.js";
import { TankDescriptor } from "../../versions/shared/tank.js";
import { Wall } from "../../versions/shared/wall.js";

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

function getCellIndex(state, x, y) {
    return (y * state.width) + x;
}

function getCellPosition(state, index) {
    return new Position(
        index % state.width,
        Math.floor(index / state.width));
}

export function getCell(state, x, y) {
    return state.cells[getCellIndex(state, x, y)];
}

export function modifyCell(state, x, y, modifyCell) {
    const { cells } = state;
    const index = getCellIndex(state, x, y);

    return {
        ...state,
        cells: [
            ...cells.slice(0, index),
            modifyCell(cells[index], x, y),
            ...cells.slice(index + 1),
        ]
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



function getProperties(entity) {
    return [{
        title: "Attributes",
        pairs: Object.keys(entity).map(key => ({
            title: key,
            value: entity[key].toString(),
        }))
    }];
}

export function boardFromBoard(gameState) {
    const {board} = gameState;
    return createBoard(board.width, board.height, (x, y) => {
        const position = new Position(x, y);
        const unit = board.getUnitAt(position);
        const floor = board.getFloorTileAt(position);

        let descriptor;
        if(unit.type == "Tank") {
            descriptor = new TankDescriptor(unit, gameState);
        }
        else if(unit.type == "Wall") {
            descriptor = new Wall(unit, gameState);
        }

        let unitProps = {
            showUnitTile: false,
            showPopup: false,
            indicators: [],
        };

        if(descriptor) {
            const {style: { color: textColor, background: icon }} = descriptor.getTileStyle();
            const badge = descriptor.getBadge();

            unitProps = {
                showUnitTile: true,
                icon,
                textColor,
                text: descriptor.getFeaturedAttribute(),
                label: descriptor.getName(),
                badge: badge && {
                    text: badge.text,
                    background: badge.style.background,
                    textColor: badge.style.color,
                },
                indicators: descriptor.getIndicators().map(indicator => ({
                    symbol: indicator.symbol,
                    color: indicator.style.color,
                })),
                indicatorBackground: descriptor.getIndicatorBackground(),
                showPopup: false,
                popup: {
                    title: descriptor.getName() || unit.type,
                    sections: getProperties(unit),
                    buttons: [
                        { text: "Submit Action" },
                    ]
                },
            };
        }
        else if(floor.type != "empty") {
            unitProps.popup = {
                title: floor.type,
                sections: getProperties(floor),
            };
        }

        return {
            background: floor.type == "GoldMine" ? "#fd0" : "",
            ...unitProps,
        };
    });
}

export function boardReducer(state, action) {
    if(action.type == "import-board") {
        if(action.gameState) {
            return {
                ...state,
                board: boardFromBoard(action.gameState),
            };
        }

        return undefined;
    }

    if(action.type == "start-selecting") {
        return {
            ...state,
            isSelecting: true,
        };
    }

    if(action.type == "stop-selecting") {
        return {
            ...state,
            isSelecting: false,
            board: modifyCell(state.board, action.x, action.y, current => ({
                ...current,
                isSelected: false,
            })),
        };
    }

    if(action.type == "board.tile.click" && state.isSelecting) {
        return {
            ...state,
            board: modifyCell(state.board, action.x, action.y, current => ({
                ...current,
                isSelected: !current.isSelected,
            })),
        };
    }

    if(action.type == "board.tile.click") {
        return {
            ...state,
            board: modifyCell(state.board, action.x, action.y, current => ({
                ...current,
                showPopup: true,
            })),
        };
    }

    if(action.type == "board.tile.popup.close") {
        return {
            ...state,
            board: modifyCell(state.board, action.x, action.y, current => ({
                ...current,
                showPopup: false,
            })),
        };
    }

    console.log(action);

    return state;
}
