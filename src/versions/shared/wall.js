import { UnitDescriptor, TileStyle, imageBackground } from "../base/descriptors.js";

const NUM_WALL_STAGES = 6;

export class Wall extends UnitDescriptor {
    getTileStyle() {
        const durability = this.unit.durability;

        let status = "";
        if(durability.max !== undefined) {
            status = Math.round((durability.value / durability.max) * NUM_WALL_STAGES);
        }
        else {
            status = Math.min(durability, NUM_WALL_STAGES);
        }

        return new TileStyle({
            background: imageBackground(`Wall-${status}`),
        });
    }
}