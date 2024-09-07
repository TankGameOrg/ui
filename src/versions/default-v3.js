import { GameVersion } from "./base/index.js";
import { LogEntryFormatter, baseEntryFunctions } from "./base/log-entry-formatter.js";
import { commonAttributeDescriptors } from "./shared/attributes.js";
import { GoldMineDescriptor } from "./shared/gold-mine.js";
import { TankDescriptor } from "./shared/tank.js";
import { Wall } from "./shared/wall.js";

function actionFactory(engine) {
    return engine.getEngineSpecificSource ?
        [engine.getEngineSpecificSource()] : [];

}

// V4 is almost identical to v3 so let it reuse everything
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
    actionFactory,
};

export const version3 = new GameVersion(rawV3Config);
