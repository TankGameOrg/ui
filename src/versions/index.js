import { logger } from "#platform/logging.js";
import { GameVersion } from "./base/index.js";
import { version3 } from "./default-v3.js";
import { version4 } from "./default-v4.js";
import { version5 } from "./default-v5.js";

const gameVersions = {
    "default-v3": version3,
    "default-v4": version4,
    "default-v5-experimental": version5,
};


export function getGameVersion(version) {
    let config = gameVersions[version];

    if(config === undefined) {
        logger.warn({ msg: `Game version ${version} is not supported.  Using uninitialized version config.` });
        config = new GameVersion();
    }

    return config;
}

export function getAllVersions() {
    return Object.keys(gameVersions);
}