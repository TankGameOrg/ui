import { logger } from "#platform/logging.js";
import { getAllVersions } from "../versions/index.js";


export class EngineManager {
    constructor(allFactories) {
        allFactories = allFactories.flat();

        this._factoryForVersion = {};
        let enginesForVersion = {};
        for(const supportedVersion of getAllVersions()) {
            this._factoryForVersion[supportedVersion] = allFactories
                .find(engineFactory => engineFactory.getSupportedGameVersions().includes(supportedVersion));

            enginesForVersion[supportedVersion] = this._factoryForVersion[supportedVersion].getEngineVersion();
        }

        logger.info({
            enginesForVersion,
        });
    }

    getEngineFactory(gameVersion) {
        return this._factoryForVersion[gameVersion];
    }
}
