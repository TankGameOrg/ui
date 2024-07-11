import { AttributeDescriptor } from "../base/descriptors.js";

export const commonAttributeDescriptors = {
    gold: AttributeDescriptor.make({ category: "resources" }),
    actions: AttributeDescriptor.make({ category: "resources" }),
    last_action_time: AttributeDescriptor.make({ displayAs: "hidden" }),
};