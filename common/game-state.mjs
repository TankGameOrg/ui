import Entity from "./entity.mjs";
import { FloorTile } from "./floor-tile.mjs";
import { Position } from "./position.mjs";

export default class GameState {
    constructor(options) {
        Object.assign(this, options);
    }

    static fromRawState(error, rawGameState) {
        let state = new GameState({
            day: rawGameState.day,
            error,
            council: {
                coffer: rawGameState.council.coffer,
            }
        });

        state._convertBoard("unitBoard", rawGameState.board.unit_board, (space, x, y) => new Entity(space, new Position(x, y)));
        state._convertBoard("floorBoard", rawGameState.board.floor_board, space => new FloorTile(space));
        state._buildUserLists(rawGameState);
        return state;
    }

    // State translation functions
    //
    // These functions serve to create an abstraction between tank_game_ui and TankGame engine.
    // By doing so we limit the scope of the changes required to support new versions of the engine.

    _convertBoard(boardName, board, boardSpaceFactory) {
        let newBoard = this[`_${boardName}`] = [];

        if(this.height === undefined) {
            this.height = board.length;
        }
        else if(this.height != board.length) {
            throw new Error(`Board ${boardName} has a length of ${board.length} but previous boards had a length of ${this.height}`);
        }

        for(let y = 0; y < board.length; ++y) {
            const row = board[y];
            newBoard.push([]); // add the row to our unit board

            if(this.width === undefined) {
                this.width = row.length;
            }
            else if(this.width != row.length) {
                throw new Error(`Row at index ${y} has a length of ${row.length} but previous rows had a length of ${this.width}`);
            }

            for(let x = 0; x < row.length; ++x) {
                newBoard[y].push(boardSpaceFactory(board[y][x], x, y));
            }
        }
    }

    _buildUserLists(rawGameState) {
        this._entityByName = {};
        this._entityByType = {};

        this._findUsersOnGameBoard();
        this._processCouncil(rawGameState);

        for(const entityName of Object.keys(this._entityByName)) {
            const user = this._entityByName[entityName];

            if(!this._entityByType[user.type]) this._entityByType[user.type] = [];

            this._entityByType[user.type].push(user);
        }

        for(const type of Object.keys(this._entityByType)) {
            this._entityByType[type].sort((a, b) => a.name > b.name);
        }
    }

    _processCouncil(rawGameState) {
        const councilGroups = [
            [rawGameState.council.council, "council"],
            [rawGameState.council.senate, "senate"]
        ];

        for(const [users, userType] of councilGroups) {
            for(const userName of users) {
                if(this._entityByName[userName]) {
                    // Being a councelor overrides the user's previous state
                    this._entityByName[userName].type = userType;
                }
                else {
                    this._entityByName[userName] = new Entity({
                        name: userName,
                        type: userType,
                    });
                }
            }
        }
    }

    _findUsersOnGameBoard() {
        for(const row of this._unitBoard) {
            for(const entity of row) {
                if(entity.name && !this._entityByName[entity.name]) {
                    this._entityByName[entity.name] = entity;
                }
            }
        }
    }

    // Public accessors

    get valid() {
        return this.error === undefined;
    }

    getEntityByName(name) {
        return this._entityByName[name];
    }

    getEntitiesByType(userType) {
        return this._entityByType[userType];
    }

    getAllUsers() {
        return Object.keys(this._entityByName)
            .filter(entity => entity.playerClass != Entity.NON_PLAYER)
            .map(name => this._entityByName[name]);
    }

    getAllPlayerTypes() {
        return Object.keys(this._entityByType)
            .filter(type => type != Entity.NON_PLAYER);
    }

    getEntityAt(position) {
        return this._unitBoard[position.y][position.x];
    }

    getFloorTileAt(position) {
        return this._floorBoard[position.y][position.x];
    }

    getAllSpaces() {
        let spaces = [];

        for(let y = 0; y < this.height; ++ y) {
            for(let x = 0; x < this.width; ++ x) {
                spaces.push(this.getEntityAt(new Position(x, y)));
            }
        }

        return spaces;
    }
}