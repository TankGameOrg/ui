import { EntityDescriptor, TileStyle, imageBackground } from "../base/descriptors.js";

export class LootBoxDescriptor extends EntityDescriptor {
    getTileStyle() {
        return new TileStyle({
            background: imageBackground("loot-box"),
        });
    }
}