import { GameVersion } from "./base/index.js";
import { rawV3Config } from "./3.js";
import { Wall } from "./shared/wall.js";
import { TankDescriptor } from "./shared/tank.js";

class V4WallDescriptor extends Wall {
    wallUrls = {
        1: "Wall-1",
        2: "Wall-2",
        3: "Wall-3",
        4: "Wall-4",
        5: "Wall-5",
        6: "Wall-6",
    };
}

class V4TankDescriptor extends TankDescriptor {
    customTeamIcons = {
        "abrams": "Tank-Abrams",
        "centurion": "Tank-Centurion",
        "leopard": "Tank-Leopard",
    };
}

export const version4 = new GameVersion({
    ...rawV3Config,
    entryDescriptors: {
        tank: V4TankDescriptor,
        wall: V4WallDescriptor,
    },
    manualPath: "/manuals/Tank_Game_Rules_v4.pdf",
});
