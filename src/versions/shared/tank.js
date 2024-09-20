import { Badge, UnitDescriptor, Indicator, TileStyle, imageBackground } from "../base/descriptors.js";

const TANK_TEAMS_WITH_ICONS = new Set([
    "abrams",
    "centurion",
    "leopard",
    "olifant",
]);

export class TankDescriptor extends UnitDescriptor {
    getFeaturedAttribute() {
        const {durability} = this.unit;
        return durability?.value !== undefined ? durability.value : durability;
    }

    getTileStyle() {
        const isDead = this.unit.dead;

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
        let {actions} = this.unit;
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
        const bounty = this.unit.bounty;
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
        if(this.unit.playerRef) {
            return this.unit.playerRef.getPlayer(this.gameState);
        }
    }

    getName() {
        return this._getPlayer()?.name;
    }

    formatForLogEntry() {
        let formatted = this.getName();

        if(this.unit.dead) {
            formatted += " [dead]";
        }

        return formatted;
    }
}