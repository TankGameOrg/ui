import { GameVersion } from "./base/index.js";
import { commonVersionConfig } from "./common.js";
import { version3 } from "./default-v3.js";
import { version4 } from "./default-v4.js";

const gameVersions = {
    "default-v3": version3,
    "default-v4": version4,
};


export function getGameVersion(version) {
    let config = gameVersions[version];

    if(config === undefined) {
        config = new GameVersion(commonVersionConfig);
    }

    return config;
}

export function getAllVersions() {
    return Object.keys(gameVersions);
}