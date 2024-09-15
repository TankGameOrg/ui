import { GameVersion } from "./base/index.js";
import { commonVersionConfig } from "./common.js";
import { findGlobalCooldowns } from "./shared/global-cooldown.js";

export const version4 = new GameVersion({
    ...commonVersionConfig,
    manualPath: "/manuals/default-v4.html",
    findCooldowns: findGlobalCooldowns,
});
