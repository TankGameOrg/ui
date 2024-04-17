import assert from "node:assert";
import { FILE_FORMAT_VERSION, GameManager, MINIMUM_SUPPORTED_FILE_FORMAT_VERSION, load, save } from "../../src/game-file.mjs";
import { Config } from "../../../common/state/config/config.mjs";
import path from "node:path";
import fs from"node:fs";
import crypto from "node:crypto";
import { MockEngine } from "../common/game-interactor.mjs";

const TEST_FILES = "test/backend/test-files";
const sampleFileBaseName = `tank_game_v3_format_v${FILE_FORMAT_VERSION}`;
const sampleFilePath = path.join(TEST_FILES, `${sampleFileBaseName}.json`);

const gameConfig = new Config({
    gameVersionConfigs: {
        3: {},
    },
    backend: {
        gamesFolder: TEST_FILES,
    },
});

const emptyConfig = new Config({
    gameVersionConfigs: {},
});

function validateLogBook(logBook) {
    assert.equal(logBook.getMaxDay(), 16);
    assert.equal(logBook.getEntry(77).type, "shoot");
}

function validateSampleFile({logBook, initialGameState}) {
    // Sanity check a few properties to make sure we loaded the data
    validateLogBook(logBook)
    assert.equal(initialGameState.board.width, 11);
    assert.equal(initialGameState.board.height, 11);
    assert.deepEqual(initialGameState.players.getPlayerByName("Steve").name, "Steve");
}

function hashFile(filePath) {
    return new Promise((resolve) => {
        let hashStream = crypto.createHash("sha256");
        let fileStream = fs.createReadStream(filePath);

        fileStream.on("end", function() {
            hashStream.end();
            resolve(hashStream.read().toString("hex"));
        });

        fileStream.pipe(hashStream);
    });
}

describe("GameFile", () => {
    it("can load and deserialize the latest format with version specific config", async () => {
        validateSampleFile(await load(sampleFilePath, gameConfig));
    });

    it("can load and deserialize the latest format without version specific config", async () => {
        validateSampleFile(await load(sampleFilePath, emptyConfig));
    });

    for(let version = MINIMUM_SUPPORTED_FILE_FORMAT_VERSION; version < FILE_FORMAT_VERSION; ++version) {
        it(`loading version ${version} returns the same data as version ${FILE_FORMAT_VERSION}`, async () => {
            const oldFilePath = path.join(TEST_FILES, `tank_game_v3_format_v${version}.json`);

            const oldFile = await load(oldFilePath, gameConfig);
            const newFile = await load(sampleFilePath, gameConfig);

            assert.deepEqual(oldFile, newFile);
        });
    }

    // TODO: Disabled until file format v3 is done
    xit("loading and saving a file recreates the original file", async () => {
        const tempFile = path.join(TEST_FILES, `tank_game_temp_test_file-load-save.json`);

        await save(tempFile, await load(sampleFilePath, gameConfig));

        const orig = await hashFile(sampleFilePath);
        const recreated = await hashFile(tempFile);

        assert.equal(orig, recreated);

        // This only deletes the temp file on success so that it can be analyzed on failure.  The temp file
        // is in the git ignore.
        fs.unlinkSync(tempFile);
    });

    it("can load all of the games in a folder", async () => {
        const mockEngineFactory = () => new MockEngine();

        // This test logs load errors to the console as warnings.  You may want to set the LOG_LEVEL to info
        // in the package.json if you want to debug this test.
        const gameManager = new GameManager(gameConfig, mockEngineFactory);

        await gameManager.loaded;

        // Wait for all the games to load and swallow the load errors
        await Promise.all(
            gameManager.getAllGames()
                .map(name => gameManager.getGamePromise(name).catch(() => {}))
        );

        const game = gameManager.getGame(sampleFileBaseName).interactor;

        validateLogBook(game.getLogBook());

        // Files from previous versions should be loaded
        for(let version = MINIMUM_SUPPORTED_FILE_FORMAT_VERSION; version < FILE_FORMAT_VERSION; ++version) {
            assert.ok(gameManager.getGame(`tank_game_v3_format_v${version}`).loaded);
        }

        // The invalid file should not be loaded
        assert.equal(gameManager.getGame("bad_file").error, "Cannot read properties of undefined (reading 'game')");
        assert.ok(!gameManager.getGame("bad_file").loaded);

        // Invalid games should return an error
        assert.equal(gameManager.getGame("unknown_file").error, "unknown_file is not a valid game");
    });
});