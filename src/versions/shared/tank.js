import { Badge, EntityDescriptor, Indicator, TileStyle, imageBackground } from "../base/descriptors.js";

const TANK_TEAMS_WITH_ICONS = new Set([
    "abrams",
    "centurion",
    "leopard",
    "olifant",
]);

export class TankDescriptor extends EntityDescriptor {
    getFeaturedAttribute() {
        const {durability} = this.entity;
        return durability?.value !== undefined ? durability.value : durability;
    }

    getTileStyle() {
        const isDead = this.entity.dead;

        let icon = isDead ? "DeadTank" : "Tank"

        const team = this._getPlayer()?.team?.toLowerCase?.();
        if(TANK_TEAMS_WITH_ICONS.has(team)) {
            icon = `Tank-${team}${isDead ? "-dead" : ""}`;
        }

        return new TileStyle({
            textColor: "#fff",
            background: imageBackground(icon),
        });
    }

    getBadge() {
        let {actions} = this.entity;
        if(actions === undefined) return;

        if(actions?.value !== undefined) {
            actions = actions.value;
        }

        return new Badge({
            text: actions,
            textColor: "#fff",
            background: "#00f",
        });
    }

    getIndicators() {
        const bounty = this.entity.bounty;
        if(bounty !== undefined && bounty > 0) {
            return [
                new Indicator({
                    symbol: "B",
                    textColor: "orange",
                }),
            ];
        }

        return [];
    }

    _getPlayer() {
        if(this.entity.playerRef) {
            return this.entity.playerRef.getPlayer(this.gameState);
        }
    }

    getName() {
        return this._getPlayer()?.name;
    }

    formatForLogEntry() {
        let formatted = this.getName();

        if(this.entity.dead) {
            formatted += " [dead]";
        }

        return formatted;
    }
}