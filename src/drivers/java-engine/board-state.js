// State translation functions
//
// These functions serve to create an abstraction between tank_game_ui and TankGame engine.
// By doing so we limit the scope of the changes required to support new versions of the engine.
//
// This file specifically targets the current main version v0.0.3

import Board from "../../game/state/board/board.js";
import Entity from "../../game/state/board/entity.js";
import { GameState } from "../../game/state/game-state.js";
import Player from "../../game/state/players/player.js";
import { Position } from "../../game/state/board/position.js";
import { logger } from "#platform/logging.js";
import { Council } from "../../game/state/meta/council.js";

function mapTypeToClass(type, boardType) {
    if(type == "empty") {
        return boardType == "entity" ? "EmptyUnit" : "WalkableFloor";
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

    let board = convertBoard(undefined, rawGameState.$BOARD.unit_board, (newBoard, rawEntity, position) => {
        newBoard.setEntity(entityFromBoard(rawEntity, playersByName));
    });

    board = convertBoard(board, rawGameState.$BOARD.floor_board, (newBoard, space, position) => {
        newBoard.setFloorTile(entityFromBoard(space));
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
            winners = councilors.concat(senators).map(ref => ref.getPlayer(gameState).attributes.name);
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

function getAttributeName(name) {
    name = name.toLowerCase();

    if(name.startsWith("$")) {
        name = name.slice(1);
    }

    return name;
}

function shouldKeepAttribute(attributeName) {
    if(!attributeName.startsWith("$") || attributeName.startsWith("$MAX_")) return false;

    if(["$PLAYER_REF"].includes(attributeName)) {
        return false;
    }

    return true;
}

function decodeAttributes(rawAttributes) {
    let attributes = {};

    for(const attributeName of Object.keys(rawAttributes)) {
        if(!shouldKeepAttribute(attributeName)) continue;

        const actualName = getAttributeName(attributeName);
        attributes[actualName] = rawAttributes[attributeName];

        if(actualName == "only_lootable_by") {
            attributes[actualName] = attributes[actualName].name;
        }

        if(attributes[actualName]?.class == "Position") {
            attributes[actualName] = new Position(attributes[actualName]);
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

function entityFromBoard(rawEntity, playersByName) {
    const type = mapClassToType(rawEntity.class);
    let attributes = decodeAttributes(rawEntity);

    const {$PLAYER_REF} = rawEntity;
    if($PLAYER_REF && playersByName) {
        attributes.playerRef = playersByName[$PLAYER_REF.name].asRef();
    }

    return new Entity({
        type,
        attributes,
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

function buildBoard(board, entityFn) {
    let rawBoard = [];

    for(let y = 0; y < board.height; ++y) {
        let row = [];
        rawBoard.push(row);

        for(let x = 0; x < board.width; ++x) {
            row.push(entityFn(new Position(x, y), board));
        }
    }

    return rawBoard;
}

function buildPlayerRef(player) {
    return {
        class: "PlayerRef",
        name: player.name,
    };
}

function buildPlayer(player) {
    let attributes = {};

    for(const attributeName of Object.keys(player.attributes)) {
        attributes["$" + attributeName.toUpperCase()] = player.attributes[attributeName];
    }

    return {
        class: "Player",
        ...attributes,
    };
}

function buildUnit(position, board, boardType, gameState) {
    const entity = board[boardType == "entity" ? "getEntityAt" : "getFloorTileAt"](position);

    let attributes = {};
    for(const attributeName of Object.keys(entity.attributes)) {
        let value = entity.attributes[attributeName];
        if(value.max !== undefined) {
            attributes["$MAX_" + attributeName.toUpperCase()] = value.max;
            value = value.value;
        }

        attributes["$" + attributeName.toUpperCase()] = value;
    }

    attributes.$POSITION = buildPosition(entity.attributes.position);

    if(entity.attributes.playerRef !== undefined) {
        attributes.$PLAYER_REF = buildPlayerRef(entity.attributes.playerRef.getPlayer(gameState));
        delete attributes.$PLAYERREF;
    }

    return {
        class: mapTypeToClass(entity.type, boardType),
        ...attributes,
    };
}

function makeCouncilList(councilList, gameState) {
    const players = councilList
        .map(playerRef => playerRef.getPlayer(gameState))
        .map(player => buildPlayerRef(player));

    return {
        "class": "AttributeList",
        elements: players,
    }
}

function makeCouncil(councilEntity, gameState) {
    let additionalAttributes = {};

    if(councilEntity.armistice !== undefined) {
        additionalAttributes = {
            ...additionalAttributes,
            $ARMISTICE_COUNT: councilEntity.armistice.value,
            $ARMISTICE_MAX: councilEntity.armistice.max,
        };
    }

    return {
        class: "Council",
        $COFFER: councilEntity.coffer,
        ...additionalAttributes,
        $COUNCILLORS: makeCouncilList(councilEntity.councilors, gameState),
        $SENATORS: makeCouncilList(councilEntity.senators, gameState),
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
            unit_board: buildBoard(gameState.board, (position, board) => buildUnit(position, board, "entity", gameState)),
            floor_board: buildBoard(gameState.board, (position, board) => buildUnit(position, board, "floorTile", gameState)),
        },
        $COUNCIL: makeCouncil(gameState.metaEntities.council, gameState),
        $PLAYERS: {
            class: "AttributeList",
            elements: gameState.players.getAllPlayers().map(player => buildPlayer(player)),
        },
    };
}
