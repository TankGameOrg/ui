import express from "express";
import { logger } from "./logging.mjs"
import { makeHttpLogger } from "./logging.mjs";
import { loadConfig } from "./config-loader.mjs";
import { defineRoutes } from "./routes.mjs";

// If build info is supplied print it
const buildInfo = process.env.BUILD_INFO;
if(buildInfo) logger.info(`Build info: ${buildInfo}`);

const app = express();

app.use(makeHttpLogger());
app.use(express.json());

// Helper to make interacting with games easier for routes
function gameAccessor(gameManager, config) {

    return (req, res, next) => {
        function getGameIfAvailable() {
            const {loaded, error, interactor} = gameManager.getGame(req.params.gameName);

            if(error) {
                res.json({
                    error: `Failed to load game: ${error}`,
                });
                return;
            }

            if(!loaded) {
                res.json({
                    error: "Game is still loading"
                });
                return;
            }

            return interactor;
        }

        req.games = {
            getGameIfAvailable,
            gameManager,
            config
        };

        next();
    };
}


(async () => {
    let { config, gameManager } = await loadConfig()

    app.use(gameAccessor(gameManager, config));

    defineRoutes(app);

    app.listen(config.getPort(), () => {
        logger.info(`Listening on ${config.getPort()}`);
    });
})();