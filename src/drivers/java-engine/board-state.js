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


export function gameStateFromRawState(rawGameState) {
    let board = new Board(rawGameState.$BOARD.width, rawGameState.$BOARD.height);

    for(const rawUnit of rawGameState.$BOARD.units) {
        board.setUnit(elementFromBoard(rawUnit));
    }

    for(const rawFloor of rawGameState.$BOARD.floors) {
        board.setFloorTile(elementFromBoard(rawFloor));
    }

    let gameState = new GameState(
        rawGameState.$PLAYERS.elements.map(rawPlayer => new Player(decodeAttributes(rawPlayer))),
        board,
        {
            council: convertCouncil(rawGameState.$COUNCIL),
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

function decodePlayerRef(rawPlayerRef) {
    return new PlayerRef(rawPlayerRef);
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
            attributes[actualName] = decodePlayerRef(attributes[actualName]);
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

function convertCouncil(rawCouncil) {
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
        councilors: rawCouncil.$COUNCILLORS.elements.map((ref) => decodePlayerRef(ref)),
        senators: rawCouncil.$SENATORS.elements.map((ref) => decodePlayerRef(ref)),
    });
}

function elementFromBoard(rawElement) {
    return new Element({
        type: rawElement.class,
        ...decodeAttributes(rawElement),
    });
}

////////////////////////////////////////////////////////////////////////////////

export function buildPosition(position) {
    return {
        class: "Position",
        x: position.x,
        y: position.y,
    };
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

function buildElement(element) {
    return {
        class: element.type,
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
            width: gameState.board.width,
            height: gameState.board.height,
            units: gameState.board.getAllUnits().map(unit => buildElement(unit)),
            floors: gameState.board.getAllFloors().map(floor => buildElement(floor)),
        },
        $COUNCIL: makeCouncil(gameState.metaEntities.council),
        $PLAYERS: {
            class: "AttributeList",
            elements: gameState.players.getAllPlayers().map(player => buildPlayer(player)),
        },
    };
}
