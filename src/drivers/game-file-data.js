import { LogBook } from "../game/state/log-book/log-book.js";
import { OpenHours } from "../game/open-hours/index.js";
import { getGameVersion } from "../versions/index.js";
import { gameStateFromRawState } from "./java-engine/board-state-stable.js";
import { GameState } from "../game/state/game-state.js";
import Players from "../game/state/players/players.js";
import Board from "../game/state/board/board.js";
import { deserializer } from "../deserialization.js";
import { Position } from "../game/state/board/position.js";

export const FILE_FORMAT_VERSION = 7;
export const MINIMUM_SUPPORTED_FILE_FORMAT_VERSION = 5;


function migrateToV6(content) {
    // Move game version to the top level
    content.gameVersion = content.logBook.gameVersion;

    // v5 log entries used strings for all types (due to a bug) coerce them to the correct types and convert the log book to an array
    content.logBook = content.logBook.rawEntries?.map?.(rawEntry => {
        delete rawEntry.type;

        if(rawEntry.action === undefined && rawEntry.day != undefined) {
            rawEntry.action = "start_of_day";
        }

        for(const intValue of ["donation", "gold", "bounty"]) {
            if(rawEntry[intValue] !== undefined) {
                rawEntry[intValue] = +rawEntry[intValue];
            }
        }

        if(rawEntry.hi !== undefined) {
            rawEntry.hit = typeof rawEntry.hit == "boolean" ?
                rawEntry.hit :
                rawEntry.hit == "true";
        }

        return rawEntry;
    });

    // Convert initial state to the ui state format
    content.initialGameState = gameStateFromRawState(content.initialGameState).gameState.serialize();
}

function migrateToV7(content) {
    content.openHours = {
        class: "open-hours-v1",
        schedules: content.openHours.map(schedule => ({
            ...schedule,
            class: "schedule",
        })),
    };

    // Starting in v7 players a referenced by a unique (to a state) ID we need to assign those
    let nextUniqueId = 0;
    let nameToIdMap = new Map();
    content.initialGameState.players = content.initialGameState.players.map(playerAttributes => {
        ++nextUniqueId;
        nameToIdMap.set(playerAttributes.name, nextUniqueId);

        return {
            class: "player-v1",
            uniqueId: nextUniqueId,
            attributes: playerAttributes,
        };
    });

    for(const name of Object.keys(content.initialGameState.metaEntities)) {
        migrateEntityToV7(content.initialGameState.metaEntities[name], nameToIdMap);
    }

    for(let boardArray of [content.initialGameState.board.entities, content.initialGameState.board.floor]) {
        for(let entity of boardArray) migrateEntityToV7(entity, nameToIdMap);
    }

    content.initialGameState.board.class = "board-v1";

    content.logBook = {
        class: "log-book-v1",
        entries: content.logBook.map(entry => ({
            ...entry,
            class: "log-entry-v1",
        })),
    };

    content.initialGameState.class = "game-state-v1";
    content.gameVersion = `default-v${content.gameVersion}`;
}

function migrateEntityToV7(entity, nameToIdMap) {
    entity.class = "entity";

    if(entity.position !== undefined) {
        const position = new Position(entity.position);
        entity.position = {
            class: "position",
            x: position.x,
            y: position.y,
        };
    }

    entity.players = entity.players?.map?.(playerName => ({
        playerId: nameToIdMap.get(playerName),
        class: "player-ref-v1"
    }));
}


export function loadFromRaw(content) {
    if(content?.fileFormatVersion === undefined) {
        throw new Error("File format version missing not a valid game file");
    }

    if(content.fileFormatVersion > FILE_FORMAT_VERSION) {
        throw new Error(`File version ${content.fileFormatVersion} is not supported.  Try a newer Tank Game UI version.`);
    }

    if(content.fileFormatVersion < MINIMUM_SUPPORTED_FILE_FORMAT_VERSION) {
        throw new Error(`File version ${content.fileFormatVersion} is no longer supported.  Try an older Tank Game UI version.`);
    }

    if(content.fileFormatVersion == 5) {
        migrateToV6(content);
    }

    if(content.fileFormatVersion == 6) {
        migrateToV7(content);
    }

    content = deserializer.deserialize(content);

    // Make sure we have the config required to load this game.  This
    // does not check if the engine supports this game version.
    if(!getGameVersion(content.gameVersion)) {
        throw new Error(`Game version ${content.gameVersion} is not supported`);
    }

    if(content.openHours === undefined) {
        content.openHours = new OpenHours([]);
    }

    return content;
}

export function dumpToRaw({gameVersion, logBook, initialGameState, openHours, gameSettings}) {
    return deserializer.serialize({
        fileFormatVersion: FILE_FORMAT_VERSION,
        gameVersion,
        gameSettings,
        openHours,
        logBook: logBook.withoutStateInfo(),
        initialGameState: initialGameState,
    });
}

export function createEmptyFileData({gameVersion, width, height, metaEntities = {}}) {
    return {
        gameVersion,
        openHours: new OpenHours([]),
        logBook: new LogBook([]),
        gameSettings: {},
        initialGameState: new GameState(
            new Players([]),
            new Board(width, height),
            metaEntities,
        ),
    };
}
