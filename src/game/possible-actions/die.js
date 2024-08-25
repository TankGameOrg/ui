import { deserializer } from "../../deserialization.js";

class Die {
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
    constructor(count, dieName) {
        this.count = count;
        this.die = commonDice[dieName];
        if(this.die === undefined) {
            throw new Error(`No die named ${dieName}`);
        }
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
            die: this.die.name,
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

deserializer.registerClass("dice", Dice);

const commonDice = {
    "hit die": new Die({
        name: "hit die",
        namePlural: "hit dice",
        sides: [
            { display: "hit", value: true, icon: "hit" },
            { display: "miss", value: false, icon: "" },
        ]
    }),
    "d4": new Die({
        name: "d4",
        sides: [
            1,
            2,
            3,
            4,
        ]
    }),
    "d6": new Die({
        name: "d6",
        sides: [
            1,
            2,
            3,
            4,
            5,
            6,
        ]
    }),
};
