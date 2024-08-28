import { prettyifyName } from "../../utils.js";
import { AttributeDescriptor } from "../base/descriptors.js";

export const commonAttributeDescriptors = {
    gold: AttributeDescriptor.make({ category: "resources" }),
    actions: AttributeDescriptor.make({ category: "resources" }),
    power: AttributeDescriptor.make({ category: "resources" }),
    health: AttributeDescriptor.make({ category: "stats" }),
    durability: AttributeDescriptor.make({ category: "stats" }),
    range: AttributeDescriptor.make({ category: "stats" }),
    speed: AttributeDescriptor.make({ category: "stats" }),
    global_cooldown_end_time: AttributeDescriptor.make({ displayAs: "hidden" }),
    type: AttributeDescriptor.make({ displayAs: "hidden" }),
    previous_speed: AttributeDescriptor.make({ displayAs: "hidden" }),
    name: AttributeDescriptor.make({ displayAs: "hidden" }),
    team: class extends AttributeDescriptor {
        getValueText() {
            return prettyifyName(this.attribute);
        }
    },
};