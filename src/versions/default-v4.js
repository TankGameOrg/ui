import { GameVersion } from "./base/index.js";
import { rawV3Config } from "./default-v3.js";
import { findGlobalCooldowns } from "./shared/global-cooldown.js";

export const rawV4Config = {
    ...rawV3Config,
    manualPath: "/manuals/default-v4.html",
    findCooldowns: findGlobalCooldowns,
};

export const version4 = new GameVersion(rawV4Config);
