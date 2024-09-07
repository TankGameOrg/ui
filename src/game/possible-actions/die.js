import { deserializer } from "../../deserialization.js";

export class Die {
    constructor({ name, namePlural, sides }) {
        this.name = name;
        this.namePlural = namePlural || name + "s";
        this.sides = sides;

        this._displayToRaw = {};
        this._rawToDisplay = {};
        this.sideNames = [];
        for(const side of sides) {
            const value = side.value !== undefined ? side.value : side;
            const display = side.display !== undefined ? side.display : value;
            this.sideNames.push(display);
            this._displayToRaw[display] = value;
            this._rawToDisplay[value] = { display, icon: side.icon };
        }
    }

    static deserialize(rawDie) {
        return new Die(rawDie);
    }

    serialize() {
        return {
            name: this.name,
            namePlural: this.namePlural,
            sides: this.sides,
        };
    }

    roll() {
        const sideIdx = Math.floor(Math.random() * this.sides.length);
        const side = this.sides[sideIdx];
        return side.value !== undefined ? side.value : side;
    }

    translateValue(display) {
        return this._displayToRaw[display];
    }

    getSideFromValue(value) {
        return this._rawToDisplay[value];
    }
}


export class Dice {
    constructor(count, die) {
        this.count = count;
        this.die = overrideDice[die.name] || die;
    }

    static expandAll(dice) {
        return dice.flatMap(dice => dice.expandDice());
    }

    static deserialize(rawDice) {
        return new Dice(rawDice.count, rawDice.die);
    }

    serialize() {
        return {
            count: this.count,
            die: this.die,
        };
    }

    expandDice() {
        let dice = [];
        for(let i = 0; i < this.count; ++i) {
            dice.push(this.die);
        }
        return dice;
    }

    toString() {
        const dieName = this.count == 1 ? this.die.name : this.die.namePlural;
        return `${this.count}x ${dieName}`;
    }
}

deserializer.registerClass("die", Die);
deserializer.registerClass("dice", Dice);

// If we are given a die by the same name it will be replaced with the override dice which
// have extra UI information (like icons)
const overrideDice = {
    "hit die": new Die({
        name: "hit die",
        namePlural: "hit dice",
        sides: [
            { display: "hit", value: true, icon: "hit" },
            { display: "miss", value: false, icon: "" },
        ]
    }),
};
