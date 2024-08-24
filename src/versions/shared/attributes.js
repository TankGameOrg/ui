import { prettyifyName } from "../../utils.js";
import { AttributeDescriptor } from "../base/descriptors.js";

export const commonAttributeDescriptors = {
    gold: AttributeDescriptor.make({ category: "resources" }),
    actions: AttributeDescriptor.make({ category: "resources" }),
    power: AttributeDescriptor.make({ category: "resources" }),
    global_cooldown_end_time: AttributeDescriptor.make({ displayAs: "hidden" }),
    type: AttributeDescriptor.make({ displayAs: "hidden" }),
    previous_speed: AttributeDescriptor.make({ displayAs: "hidden" }),
    team: class extends AttributeDescriptor {
        getValueText() {
            return prettyifyName(this.attribute);
        }
    },
};