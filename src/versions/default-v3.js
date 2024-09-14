import { GameVersion } from "./base/index.js";
import { LogEntryFormatter, baseEntryFunctions } from "./base/log-entry-formatter.js";
import { commonAttributeDescriptors } from "./shared/attributes.js";
import { GoldMineDescriptor } from "./shared/gold-mine.js";
import { TankDescriptor } from "./shared/tank.js";
import { Wall } from "./shared/wall.js";

export const rawV3Config = {
    logFormatter: new LogEntryFormatter(baseEntryFunctions),
    entityDescriptors: {
        tank: TankDescriptor,
        wall: Wall,
    },
    floorTileDescriptors: {
        gold_mine: GoldMineDescriptor,
    },
    councilPlayerTypes: [
        "councilor",
        "senator",
    ],
    attributeDescriptors: commonAttributeDescriptors,
    manualPath: "/manuals/default-v3.html",
};

export const version3 = new GameVersion(rawV3Config);
