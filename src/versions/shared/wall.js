import { EntityDescriptor, TileStyle, imageBackground } from "../base/descriptors.js";

const NUM_WALL_STAGES = 6;

export class Wall extends EntityDescriptor {
    getTileStyle() {
        const durability = this.entity.attributes.durability;

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