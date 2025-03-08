import { Position } from "../../game/state/board/position.js";
import { TankDescriptor } from "../../versions/shared/tank.js";
import { Wall } from "../../versions/shared/wall.js";
import { createBoard, modifyAllCells, modifyCell, modifyCellsFromList } from "./state.js";

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
                        { text: "Submit Action", dispatchType: "start-selecting" },
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
            board: modifyCellsFromList(state.board, {
                list: action.selectable,
                modifyCellsFromList: cell => ({
                    ...cell,
                    showPopup: false,
                    isDisabled: false,
                }),
                modifyOtherCell: cell => ({
                    ...cell,
                    showPopup: false,
                    isDisabled: true,
                }),
            }),
        };
    }

    if(action.type == "stop-selecting") {
        return {
            ...state,
            isSelecting: false,
            board: modifyAllCells(state.board, (current) => ({
                ...current,
                isSelected: false,
                isDisabled: false,
            })),
        };
    }

    if(action.type == "board.tile.click" && state.isSelecting) {
        return {
            ...state,
            board: modifyAllCells(state.board, (current, position) => ({
                ...current,
                isSelected: position.x == action.position.x && position.y == action.position.y,
            })),
        };
    }

    if(action.type == "board.tile.click") {
        return {
            ...state,
            board: modifyCell(state.board, action.position, current => ({
                ...current,
                showPopup: true,
            })),
        };
    }

    if(action.type == "board.tile.popup.close") {
        return {
            ...state,
            board: modifyCell(state.board, action.position, current => ({
                ...current,
                showPopup: false,
            })),
        };
    }

    console.log(action);

    return state;
}
