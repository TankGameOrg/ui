import { useMemo } from "preact/hooks";
import { useActionTemplate } from "./game";
import { Position } from "../position";
import { LOG_BOOK_FIELD_MAPPINGS, TARGET_TYPE_FOR_ACTION } from "../config.js";


export function usePossibleActions(game, turnState, selectedUser, boardState) {
    const [actionTemplate, __] = useActionTemplate(game);

    return useMemo(() => {
        return buildPossibleActionsForUser(actionTemplate, turnState, selectedUser, boardState)
    }, [actionTemplate, turnState, selectedUser, boardState]);
}


function buildPossibleActionsForUser(actionTemplate, turnState, selectedUser, boardState) {
    if(!turnState || !actionTemplate || !selectedUser) return {};
    const user = turnState.getEntityByName(selectedUser);

    // Get the action template for this user's class
    actionTemplate = actionTemplate[user.playerClass];

    // No actions for this user class
    if(!actionTemplate) return {};

    let possibleActions = {};
    for(const actionName of Object.keys(actionTemplate)) {
        let uiActionSpec = possibleActions[actionName] = [];

        for(const fieldTemplate of actionTemplate[actionName].fields) {
            let uiFieldSpec = {
                name: fieldTemplate.name,
                logBookField: LOG_BOOK_FIELD_MAPPINGS[`${actionName}-${fieldTemplate.name}`] || fieldTemplate.name,
            };

            uiActionSpec.push(uiFieldSpec);

            if(fieldTemplate.type == "integer") {
                uiFieldSpec.type = "input-number";
            }
            else if(fieldTemplate.type == "boolean") {
                uiFieldSpec.type = "select";
                uiFieldSpec.options = [true, false];
            }
            else if(fieldTemplate.type == "position") {
                uiFieldSpec.targetTypes = TARGET_TYPE_FOR_ACTION[actionName] || ["any"];
                uiFieldSpec.type = "select-position";
                uiFieldSpec.options = findEntityPositions(boardState, uiFieldSpec.targetTypes);
            }
            else if(fieldTemplate.type == "tank") {
                uiFieldSpec.type = "select";
                uiFieldSpec.options = turnState.getEntitiesByType("tank").map(tank => tank.name);
            }
            else {
                uiFieldSpec.type = "input";
            }
        }
    }

    return possibleActions;
}

function findEntityPositions(boardState, entityType) {
    let positions = [];

    for(let y = 0; y < boardState.unit_board.length; y++) {
        for(let x = 0; x < boardState.unit_board[y].length; x++) {
            const unit = boardState.unit_board[y][x];

            if(entityType.includes(unit.type) || entityType.includes("any")) {
                positions.push(new Position(x, y).humanReadable());
            }
        }
    }

    return positions;
}