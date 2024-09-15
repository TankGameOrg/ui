// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.
//
// This file specifically targets the current main version v0.0.3

import Board from "../../game/state/board/board.js";
import Element from "../../game/state/board/element.js";
import { GameState } from "../../game/state/game-state.js";
import Player, { PlayerRef } from "../../game/state/players/player.js";
import { Position } from "../../game/state/board/position.js";
import { logger } from "#platform/logging.js";
import { Council } from "../../game/state/meta/council.js";
import { camelToSnake, snakeToCamel } from "../../utils.js";

function mapTypeToClass(type, boardType) {
    if(type == "empty") {
        return boardType == "unit" ? "EmptyUnit" : "WalkableFloor";
    }

    let className = {
        Tank: "GenericTank",
    }[type];

    if(className === undefined) className = type;

    return className;
}

function mapClassToType(className) {
    let type = {
        GenericTank: "Tank",
        EmptyUnit: "empty",
        WalkableFloor: "empty",
    }[className];

    if(type === undefined) type = className; // throw new Error(`Could not find type for ${className}`);

    return type;
}

export function gameStateFromRawState(rawGameState) {
    const playersByName = buildUserLists(rawGameState);

    let board = convertBoard(undefined, rawGameState.$BOARD.unit_board, (newBoard, rawUnit, position) => {
        newBoard.setUnit(elementFromBoard(rawUnit, playersByName));
    });

    board = convertBoard(board, rawGameState.$BOARD.floor_board, (newBoard, space, position) => {
        newBoard.setFloorTile(elementFromBoard(space));
    });

    let gameState = new GameState(
        Object.values(playersByName),
        board,
        {
            council: convertCouncil(rawGameState.$COUNCIL, playersByName),
        },
    );

    let victoryInfo;

    if(rawGameState.$WINNER?.length > 1) {
        let winners = [rawGameState.$WINNER];
        let victoryType = "last_team_standing";

        if(rawGameState.$WINNER == "Council") {
            victoryType = "armistice_vote";
            const {councilors, senators} = gameState.metaEntities.council;
            winners = councilors.concat(senators).map(ref => ref.getPlayer(gameState).name);
        }
        else if(gameState.players.getPlayerByName(rawGameState.$WINNER) !== undefined) {
            victoryType = "last_tank_standing";
        }

        victoryInfo = {
            type: victoryType,
            winners,
        };
    }

    return {
        gameState,
        victoryInfo,
    };
}

function decodeAttributes(rawAttributes) {
    let attributes = {};

    for(const attributeName of Object.keys(rawAttributes)) {
        if(!attributeName.startsWith("$") || attributeName.startsWith("$MAX_")) continue;

        // slice(1) to remove the leading $
        const actualName = snakeToCamel(attributeName.toLowerCase().slice(1));

        attributes[actualName] = rawAttributes[attributeName];

        if(actualName == "only_lootable_by") {
            attributes[actualName] = attributes[actualName].name;
        }

        if(attributes[actualName]?.class == "Position") {
            attributes[actualName] = new Position(attributes[actualName]);
        }

        if(attributes[actualName]?.class == "PlayerRef") {
            attributes[actualName] = new PlayerRef(attributes[actualName]);
        }

        const maxAttributeName = "$MAX_" + attributeName.replace("$", "");
        if(rawAttributes[maxAttributeName] !== undefined) {
            attributes[actualName] = {
                value: attributes[actualName],
                max: rawAttributes[maxAttributeName],
            };
        }
    }

    return attributes;
}

function convertPlayer(rawPlayer) {
    if(rawPlayer.class != "Player") throw new Error(`Expected player but got ${rawPlayer.class}`);

    return new Player(decodeAttributes(rawPlayer));
}

function convertCouncil(rawCouncil, playersByName) {
    let attributes = {
        coffer: rawCouncil.$COFFER,
    };

    if(rawCouncil.$ARMISTICE_MAX !== undefined) {
        attributes.armistice = {
            value: rawCouncil.$ARMISTICE_COUNT,
            max: rawCouncil.$ARMISTICE_MAX,
        };
    }

    return new Council({
        ...attributes,
        councilors: rawCouncil.$COUNCILLORS.elements.map(({name}) => playersByName[name].asRef()),
        senators: rawCouncil.$SENATORS.elements.map(({name}) => playersByName[name].asRef()),
    });
}

function elementFromBoard(rawElement, playersByName) {
    const type = mapClassToType(rawElement.class);
    let attributes = decodeAttributes(rawElement);

    const {$PLAYER_REF} = rawElement;
    if($PLAYER_REF && playersByName) {
        attributes.playerRef = playersByName[$PLAYER_REF.name].asRef();
    }

    return new Element({
        type,
        ...attributes,
    });
}

function convertBoard(newBoard, board, boardSpaceFactory) {
    if(!newBoard) {
        if(board.length === 0) throw new Error("Zero length boards are not allowed");

        newBoard = new Board(board[0].length, board.length);
    }

    if(newBoard.height != board.length) {
        throw new Error(`Board has a length of ${board.length} but previous boards had a length of ${newBoard.height}`);
    }

    for(let y = 0; y < board.length; ++y) {
        const row = board[y];

        if(newBoard.width != row.length) {
            throw new Error(`Row at index ${y} has a length of ${row.length} but previous rows had a length of ${newBoard.width}`);
        }

        for(let x = 0; x < row.length; ++x) {
            const position = new Position(x, y);
            boardSpaceFactory(newBoard, board[y][x], position);
        }
    }

    return newBoard;
}

function buildUserLists(rawGameState) {
    let playersByName = {};

    for(const rawPlayer of rawGameState.$PLAYERS.elements) {
        playersByName[rawPlayer.$NAME] = convertPlayer(rawPlayer);
    }

    return playersByName;
}

////////////////////////////////////////////////////////////////////////////////

export function buildPosition(position) {
    return {
        class: "Position",
        x: position.x,
        y: position.y,
    };
}

function buildBoard(board, elementFn) {
    let rawBoard = [];

    for(let y = 0; y < board.height; ++y) {
        let row = [];
        rawBoard.push(row);

        for(let x = 0; x < board.width; ++x) {
            row.push(elementFn(new Position(x, y), board));
        }
    }

    return rawBoard;
}

function buildPlayerRef(playerRef) {
    return {
        class: "PlayerRef",
        name: playerRef._playerName,
    };
}

function encodeAttributes(object) {
    let attributes = {};
    for(const attributeName of Object.keys(object)) {
        let value = object[attributeName];
        if(value?.max !== undefined) {
            attributes["$MAX_" + camelToSnake(attributeName).toUpperCase()] = value.max;
            value = value.value;
        }

        if(value instanceof Position) {
            value = buildPosition(value);
        }

        if(value instanceof PlayerRef) {
            value = buildPlayerRef(value);
        }

        attributes["$" + camelToSnake(attributeName).toUpperCase()] = value;
    }

    return attributes;
}

function buildPlayer(player) {
    return {
        class: "Player",
        ...encodeAttributes(player),
    };
}

function buildElement(element, boardType) {
    return {
        class: mapTypeToClass(element.type, boardType),
        ...encodeAttributes(element),
    };
}

function makeCouncilList(councilList) {
    const players = councilList
        .map(playerRef => buildPlayerRef(playerRef));

    return {
        "class": "AttributeList",
        elements: players,
    }
}

function makeCouncil(council) {
    let additionalAttributes = {};

    if(council.armistice !== undefined) {
        additionalAttributes = {
            ...additionalAttributes,
            $ARMISTICE_COUNT: council.armistice.value,
            $ARMISTICE_MAX: council.armistice.max,
        };
    }

    return {
        class: "Council",
        $COFFER: council.coffer,
        ...additionalAttributes,
        $COUNCILLORS: makeCouncilList(council.councilors),
        $SENATORS: makeCouncilList(council.senators),
    };
}

export function gameStateToRawState(gameState) {
    return {
        class: "State",
        // It's assumed that we only interact with the engine when the game is active
        $RUNNING: true,
        $TICK: 0,
        $BOARD: {
            class: "Board",
            unit_board: buildBoard(gameState.board, (position, board) => buildElement(board.getUnitAt(position), "unit")),
            floor_board: buildBoard(gameState.board, (position, board) => buildElement(board.getFloorTileAt(position), "floorTile")),
        },
        $COUNCIL: makeCouncil(gameState.metaEntities.council),
        $PLAYERS: {
            class: "AttributeList",
            elements: gameState.players.getAllPlayers().map(player => buildPlayer(player)),
        },
    };
}
