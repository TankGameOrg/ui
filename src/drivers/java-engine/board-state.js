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


export function decodeGameState(rawGameState) {
    let gameState = new GameState({
        players: decode(rawGameState.$PLAYERS),
        board: decode(rawGameState.$BOARD),
        council: decode(rawGameState.$COUNCIL),
    });

    let victoryInfo;

    if(rawGameState.$WINNER?.length > 1) {
        let winners = [rawGameState.$WINNER];
        let victoryType = "last_team_standing";

        if(rawGameState.$WINNER == "Council") {
            victoryType = "armistice_vote";
            const {councillors, senators} = gameState.council;
            winners = councillors.concat(senators).map(ref => ref.getPlayer(gameState).name);
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

function elementFromBoard(rawElement) {
    return new Element({
        type: rawElement.class,
        ...decodeAttributes(rawElement),
    });
}

function decodeBoard(rawBoard) {
    let board = new Board(rawBoard.width, rawBoard.height);

    for(const rawUnit of rawBoard.units) {
        board.setUnit(elementFromBoard(rawUnit));
    }

    for(const rawFloor of rawBoard.floors) {
        board.setFloorTile(elementFromBoard(rawFloor));
    }

    return board;
}

function decodePlayerRef(rawPlayerRef) {
    return new PlayerRef(rawPlayerRef);
}

export function decode(json) {
    if(json?.class === undefined) return json;

    if(json.class == "Position") {
        return new Position(json);
    }

    if(json.class == "PlayerRef") {
        return decodePlayerRef(json);
    }

    if(json.class == "AttributeList") {
        return json.elements.map(element => decode(element));
    }

    if(json.class == "Council") {
        return new Council(decodeAttributes(json));
    }

    if(json.class == "Board") {
        return decodeBoard(json);
    }

    if(json.class == "Player") {
        return new Player(decodeAttributes(json));
    }

    throw new Error(`Failed to decode ${json.class}`);
}

function decodeAttributes(rawAttributes) {
    let attributes = {};

    for(const attributeName of Object.keys(rawAttributes)) {
        if(!attributeName.startsWith("$") || attributeName.startsWith("$MAX_")) continue;

        // slice(1) to remove the leading $
        const actualName = snakeToCamel(attributeName.toLowerCase().slice(1));

        attributes[actualName] = decode(rawAttributes[attributeName]);

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

////////////////////////////////////////////////////////////////////////////////

function encodePosition(position) {
    return {
        class: "Position",
        x: position.x,
        y: position.y,
    };
}

function encodePlayerRef(playerRef) {
    return {
        class: "PlayerRef",
        name: playerRef._playerName,
    };
}

function encodeElement(element) {
    return {
        class: element.type,
        ...encodeAttributes(element),
    };
}

function encodeBoard(board) {
    return {
        class: "Board",
        width: board.width,
        height: board.height,
        units: board.getAllUnits().map(unit => encodeElement(unit)),
        floors: board.getAllFloors().map(floor => encodeElement(floor)),
    };
}

export function encode(value) {
    if(value instanceof Position) {
        return encodePosition(value);
    }

    if(value instanceof PlayerRef) {
        return encodePlayerRef(value);
    }

    if(Array.isArray(value)) {
        return {
            class: "AttributeList",
            elements: value.map(element => encode(element)),
        };
    }

    if(value instanceof Council) {
        return {
            class: "Council",
            ...encodeAttributes(value),
        };
    }

    if(value instanceof Board) {
        return encodeBoard(value);
    }

    if(value instanceof Player) {
        return {
            class: "Player",
            ...encodeAttributes(value),
        };
    }

    return value
}

function encodeAttributes(object) {
    let attributes = {};
    for(const attributeName of Object.keys(object)) {
        let value = object[attributeName];
        if(value?.max !== undefined) {
            attributes["$MAX_" + camelToSnake(attributeName).toUpperCase()] = value.max;
            value = value.value;
        }

        value = encode(value);

        attributes["$" + camelToSnake(attributeName).toUpperCase()] = value;
    }

    return attributes;
}

export function encodeGameState(gameState) {
    return {
        class: "State",
        // It's assumed that we only interact with the engine when the game is active
        $RUNNING: true,
        $TICK: 0,
        $BOARD: encode(gameState.board),
        $COUNCIL: encode(gameState.council),
        $PLAYERS: encode(gameState.players.getAllPlayers()),
    };
}
