import { GameVersion } from "./base/index.js";
import { commonVersionConfig } from "./common.js";

export const version3 = new GameVersion({
    ...commonVersionConfig,
    manualPath: "/manuals/default-v3.html",
});
