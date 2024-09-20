/* global URL */
import assert from "node:assert";
import * as boardState from "../../../../src/drivers/java-engine/board-state.js";
import { load } from "../../../../src/drivers/game-file.js";
import { getLatestFilePath } from "../test-file-helper.js";

const SAMPLE_STATE = getLatestFilePath();

const BOARD_STATE_VERSIONS = [
    ["main", boardState],
];

describe("EngineInterop", () => {
    for(const [branch, library] of BOARD_STATE_VERSIONS) {
        it(`can translate to and from the engine state format (${branch})`, async () => {
            const {initialGameState} = await load(SAMPLE_STATE);

            const translated = library.decodeGameState(library.encodeGameState(initialGameState, "default-v3")).gameState;
            assert.deepEqual(translated, initialGameState);
        });
    }
});