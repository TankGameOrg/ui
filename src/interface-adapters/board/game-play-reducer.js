import { Position } from "../../game/state/board/position.js";
import { imageBackground } from "../../versions/base/descriptors.js";
import { createBoard, modifyAllCells, modifyCell, modifyCellsFromList } from "./state.js";

const TANK_TEAMS_WITH_ICONS = new Set([
    "abrams",
    "centurion",
    "leopard",
    "olifant",
]);

const NUM_WALL_STAGES = 6;

const unitFactories = {
    "Tank": (unit, gameState) => {
        let player;
        if(unit.playerRef) {
            player = unit.playerRef.getPlayer(gameState);
        }

        const isDead = unit.dead;

        let icon = isDead ? "DeadTank" : "Tank"

        const team = player?.team?.toLowerCase?.();
        if(TANK_TEAMS_WITH_ICONS.has(team)) {
            icon = `Tank-${team}${isDead ? "-dead" : ""}`;
        }

        let indicators = [];
        const bounty = unit.bounty;
        if(bounty !== undefined && bounty > 0) {
            indicators.push({
                symbol: "B",
                color: "orange",
            });
        }

        let {actions} = unit;
        if(actions === undefined) return;

        if(actions?.value !== undefined) {
            actions = actions.value;
        }

        return {
            label: player?.name,
            text: unit.durability?.value !== undefined ? unit.durability.value : unit.durability,
            textColor: "#fff",
            icon: imageBackground(icon),
            indicators,
            indicatorBackground: "#000",
            badge: {
                text: actions,
                background: "#00f",
                textColor: "#fff",
            },
            popup: {
                title: player?.name || "Tank",
                sections: [
                    {
                        pairs: [
                            {
                                title: "Durability",
                                value: unit.durability,
                            },
                            {
                                title: "Bounty",
                                value: unit.bounty,
                            },
                        ],
                    },
                    {
                        title: "Resources",
                        pairs: [
                            {
                                title: "Actions",
                                value: unit.actions,
                            },
                            {
                                title: "Gold",
                                value: unit.gold,
                            },
                        ],
                    },
                    {
                        title: "Stats",
                        pairs: [
                            {
                                title: "Range",
                                value: unit.range,
                            },
                        ],
                    },
                ],
                buttons: [
                    {
                        text: "Submit Action",
                        dispatch: {
                            type: "start-selecting",
                            selectable: [new Position("A1")]
                        },
                    },
                ]
            },
        };
    },
    "Wall": (unit) => {
        const durability = unit.durability;

        let status = "";
        if(durability.max !== undefined) {
            status = Math.round((durability.value / durability.max) * NUM_WALL_STAGES);
        }
        else {
            status = Math.min(durability, NUM_WALL_STAGES);
        }

        return {
            icon: imageBackground(`Wall-${status}`),
            popup: {
                title: "Wall",
                sections: [{
                    pairs: [{
                        title: "Durability",
                        value: unit.durability,
                    }],
                }],
            },
        };
    },
}

export function boardFromBoard(gameState) {
    const {board} = gameState;
    return createBoard(board.width, board.height, (x, y) => {
        const position = new Position(x, y);
        const unit = board.getUnitAt(position);
        const floor = board.getFloorTileAt(position);

        let unitProps = {
            showUnitTile: false,
            showPopup: false,
            indicators: [],
        };

        const unitFactory = unitFactories[unit.type];
        if(unitFactory) {
            unitProps = {
                ...unitProps,
                showUnitTile: true,
                ...unitFactory(unit, gameState),
            };
        }
        else if(floor.type != "empty") {
            unitProps.popup = {
                title: floor.type,
                sections: [],
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
