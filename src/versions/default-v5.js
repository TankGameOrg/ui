import { GameVersion } from "./base/index.js";
import { rawV4Config } from "./default-v4.js";
import { DestructibleFloor } from "./shared/destructible-floor.js";
import { HealthPoolDescriptor } from "./shared/health-pool.js";
import { UnwalkableFloor } from "./shared/unwalkable-floor.js";
import { LavaDescriptor } from "./shared/lava.js";
import { LootBoxDescriptor } from "./shared/loot-box.js";

export const rawV5Config = {
    ...rawV4Config,
    entityDescriptors: {
        ...rawV4Config.entityDescriptors,
        LootBox: LootBoxDescriptor,
    },
    floorTileDescriptors: {
        ...rawV4Config.floorTileDescriptors,
        HealthPool: HealthPoolDescriptor,
        UnwalkableFloor,
        DestructibleFloor,
        Lava: LavaDescriptor,
    },
    manualPath: undefined,
};

export const version5 = new GameVersion(rawV5Config);
