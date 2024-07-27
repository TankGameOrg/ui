// A suite of tests to make sure we're properly interfacing with the engine
/* global process */
import fs from "node:fs";
import { configureLogging } from "#platform/logging.js";
import { getGameVersion } from "../../src/versions/index.js";
import { testPossibleActions } from "./engine-tests/possible-actions.js";
import { incrementalPlaythrough } from "./engine-tests/incremental-playthrough.js";


function exists(filePath) {
    try {
        fs.accessSync(filePath);
        return true;
    }
    catch(err) {
        return false;
    }
}

export function defineTestsForEngine(engineFactory) {
    function defTest(name, testFunc, { requiresFile, logFile } = {}) {
        // Disable the tests if we don't have a given engine on hand or we don't have a test file for them
        const register = requiresFile && !exists(requiresFile) ? xit : it;

        register(name, async () => {
            if(process.env.TEST_MODE === "ci") {
                // Suppress all non fatal logging in CI to improve performance
                configureLogging({ logLevel: "error" });
            }
            else {
                // Save full trace logs for easy local debugging
                configureLogging({
                    logFile: `integration-tests/${logFile}`,
                    logLevel: process.env.LOG_LEVEL || "trace",
                    overwrite: true,
                });
            }

            try {
                await testFunc();
            }
            finally {
                // Go back to default log configuration
                configureLogging();
            }
        });
    }

    const versionsToTest = engineFactory.getSupportedGameVersions()
        .filter(supportedVersion => !!getGameVersion(supportedVersion));

    for(const supportedGameVersion of versionsToTest) {
        const TEST_GAME_PATH = `example/tank_game_v${supportedGameVersion}.json`;
        const TEST_POSSIBLE_ACTIONS_PATH = `example/possible_actions_v${supportedGameVersion}.json`;

        describe(engineFactory.getEngineVersion(), () => {
            describe(`Game version: ${supportedGameVersion}`, () => {
                defTest("can process actions together and individually", async () => {
                    await incrementalPlaythrough(engineFactory, TEST_GAME_PATH);
                }, {
                    requiresFile: TEST_GAME_PATH,
                    logFile: `incremental-v${supportedGameVersion}.log`,
                });

                defTest("can provide a list of possible actions", async () => {
                    await testPossibleActions(engineFactory, TEST_POSSIBLE_ACTIONS_PATH);
                }, {
                    requiresFile: TEST_POSSIBLE_ACTIONS_PATH,
                    logFile: `possible-actions-v${supportedGameVersion}.log`,
                });
            });
        });
    }
}