import { LogEntryFormatter } from "./base/log-entry-formatter.js";
import { TankDescriptor } from "./shared/tank.js";
import { Wall } from "./shared/wall.js";
import { DestructibleFloor } from "./shared/destructible-floor.js";
import { findGlobalCooldowns } from "./shared/global-cooldown.js";
import { AttributeDescriptor, UnitDescriptor, FloorTileDescriptor } from "./base/descriptors.js";
import { prettyifyName } from "../utils.js";
import { findAnimationsBetweenStates } from "../game/state/animations.js";


// Common log entries
function shoot(entry, formatter) {
    const verb = entry.hit || entry.hit === undefined ? "shot" : "missed";
    const target = formatter.describeLocation();

    let damageInfo = "";
    if(entry.damage !== undefined) {
        damageInfo = ` dealing ${entry.damage} damage`;
    }

    return `${entry.subject} ${verb}${damageInfo} ${target}${formatter.dieRoll("hit_roll", { prefix: " [", suffix: "]" })}`
}

const commonLogEntryFormatters = {
    shoot,
    start_of_day: entry => `Start of day ${entry.day}`,
    buy_action: entry => `${entry.subject} traded ${entry.gold} gold for actions`,
    donate: entry => `${entry.subject} donated ${entry.donation} pre-tax gold to ${entry.target_player}`,
    upgrade_range: entry => `${entry.subject} upgraded their range`,
    bounty: entry => `${entry.subject} placed a ${entry.bounty} gold bounty on ${entry.target_player}`,
    stimulus: entry => `${entry.subject} granted a stimulus of 1 action to ${entry.target_player}`,
    grant_life: entry => `${entry.subject} granted 1 life to ${entry.target_player}`,
    spawn_wall: entry => `${entry.subject} spawned a wall at ${entry.target_position}`,
    spawn_lava: entry => `${entry.subject} spawned a lava at ${entry.target_position}`,
    smite: entry => `${entry.subject} smote ${entry.target_player}`,
    heal: entry => `${entry.subject} healed ${entry.target_player}`,
    slow: entry => `${entry.subject} slowed ${entry.target_player}`,
    hasten: entry => `${entry.subject} hastened ${entry.target_player}`,
    move: (entry, formatter) =>`${entry.subject} moved to ${formatter.describeLocation(LogEntryFormatter.FLOOR_ONLY)}`,
    loot: (entry, formatter) => `${entry.subject} looted ${formatter.describeLocation(LogEntryFormatter.UNIT_ONLY)}`,
};

const commonAttributeDescriptors = {
    team: class extends AttributeDescriptor {
        getValueText() {
            return prettyifyName(this.attribute);
        }
    },

    ////////// Stats //////////
    durability: AttributeDescriptor.make({
        category: "stats",
        animationStyle: {
            background: "#f00",
            color: "#fff",
        },
    }),
    range: AttributeDescriptor.make({
        category: "stats",
        animationStyle: {
            background: "#050",
            color: "#fff",
        },
    }),
    speed: AttributeDescriptor.make({
        category: "stats",
        animationStyle: {
            background: "#f0f",
            color: "#fff",
        },
    }),

    ////////// Resources //////////
    gold: AttributeDescriptor.make({
        category: "resources",
        animationStyle: {
            background: "#fd0",
            color: "#000",
        },
    }),
    actions: AttributeDescriptor.make({ category: "resources" }),
    power: AttributeDescriptor.make({ category: "resources" }),

    ////////// Uncategorized attributes //////////
    bounty: AttributeDescriptor.make({
        animationStyle: {
            background: "orange",
            color: "#000",
        },
    }),

    ////////// Internal attributes //////////
    globalCooldownEndTime: AttributeDescriptor.make({ displayAs: "hidden" }),
    type: AttributeDescriptor.make({ displayAs: "hidden" }),
    previousSpeed: AttributeDescriptor.make({ displayAs: "hidden" }),
    councillors: AttributeDescriptor.make({ displayAs: "hidden" }),
    senators: AttributeDescriptor.make({ displayAs: "hidden" }),
    playerRef: AttributeDescriptor.make({ displayAs: "hidden" }),
    position: AttributeDescriptor.make({ displayAs: "hidden" }),
    name: AttributeDescriptor.make({ displayAs: "hidden" }),
    dead: AttributeDescriptor.make({ displayAs: "hidden" }),
    canBounty: AttributeDescriptor.make({ displayAs: "hidden" }),
};


const COST_ATTRIBUTES = new Set(["actions", "gold"]);


export function getAnimationsForState(isForwardAnimation, previousState, currentState) {
    const animations = findAnimationsBetweenStates(previousState, currentState, {
        attributesToAnimate: [
            "position", // Track player movement
            "dead", // Certain attribute changes shouldn't be shown on death
            // Interesting attributes
            "gold",
            "bounty",
            "speed",
            "range",
            "durability",
            "actions",
        ],
    });

    const positionsWithDeathChange = new Set(
        animations
            .filter(animation => animation.key == "dead")
            .map(animation => animation.position.humanReadable)
    );

    return animations
        .filter((animation) => {
            // Death triggers a bunch of attribute changes including +2 durability
            // Hide all of them to keep from confusing users
            if(positionsWithDeathChange.has(animation.position.humanReadable)) {
                return false;
            }

            // Don't show the changes to the cost attribute
            if(COST_ATTRIBUTES.has(animation.key) && animation.type == "update-attribute" && animation.difference < 0) {
                return false;
            }

            // Position is the only attribute change that can be reversed
            if(!isForwardAnimation && animation.type == "update-attribute" && animation.difference !== undefined) {
                return false;
            }

            return true;
        });
}


export const commonVersionConfig = {
    findCooldowns: findGlobalCooldowns,
    attributeDescriptors: commonAttributeDescriptors,
    getAnimationsForState,
    logFormatter: new LogEntryFormatter(commonLogEntryFormatters),
    unitDescriptors: {
        Tank: TankDescriptor,
        Wall,
        LootBox: UnitDescriptor.make({ backgroundImage: "loot-box", }),
    },
    floorTileDescriptors: {
        GoldMine: FloorTileDescriptor.make({ background: "#fd0" }),
        HealthPool: FloorTileDescriptor.make({ backgroundImage: "health-pool" }),
        UnwalkableFloor: FloorTileDescriptor.make({ backgroundImage: "unwalkable-floor" }),
        DestructibleFloor,
        Lava: FloorTileDescriptor.make({ background: "#f40" }),
    },
};
