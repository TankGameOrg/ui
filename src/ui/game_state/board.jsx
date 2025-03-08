import "./board.css";
import { Position } from "../../game/state/board/position.js";
import { UnitTile } from "./unit-tile.jsx";
import { useRef } from "preact/hooks";
import { Popup } from "../generic/popup.jsx";
import { getCell } from "../../interface-adapters/board/state.js";

export function GameBoard({ gameState, config, dispatch, animationState, dispatchAnimation, boardState }) {
    if(!boardState) {
        return <p>No board data supplied</p>;
    }

    let letters = [<Coordiate key="empty-coord"></Coordiate>];
    for(let x = 0; x < boardState.width; ++x) {
        const letter = new Position(x, 0).humanReadableX;
        letters.push(<Coordiate key={`coord-x-${x}`}>{letter}</Coordiate>);
    }

    let renderedBoard = [<div key="coords-row" className="game-board-row">{letters}</div>];

    for(let y = 0; y < boardState.height; ++y) {
        let renderedRow = [<Coordiate key={`coord-y-${y}`}>{y + 1}</Coordiate>];

        for(let x = 0; x < boardState.width; ++x) {
            const cell = getCell(boardState, new Position(x, y));

            renderedRow.push(
                <Space
                    x={x}
                    y={y}
                    cell={cell}
                    dispatch={dispatch}
                    dispatchAnimation={dispatchAnimation}
                    animationState={animationState}
                    config={config}
                    gameState={gameState}></Space>
            );
        }

        renderedBoard.push(<div className="game-board-row">{renderedRow}</div>);
    }

    return (
        <div className="game-board">{renderedBoard}</div>
    );
}

function Coordiate({ children }) {
    return (
        <div className="board-space board-space-coordinate">
            <div className="board-space-selected-overlay board-space-centered">
                {children}
            </div>
        </div>
    );
}

function Space({ cell, config, dispatch, x, y, gameState, animationState, dispatchAnimation }) {
    return (
        <Tile cell={cell} x={x} y={y} dispatch={dispatch}>
            <UnitTile
                cell={cell}
                dispatchAnimation={dispatchAnimation}
                config={config}
                gameState={gameState}
                animationState={animationState}></UnitTile>
        </Tile>
    );
}

function Tile({ dispatch, children, cell, x, y } = {}) {
    const anchorRef = useRef();
    let className = "";
    let overlayClassName = "";

    if(cell.isClickable) {
        className += " board-space-selectable";
    }

    if(cell.isCut) {
        className += " board-space-cut";
    }

    if(cell.isDisabled) {
        className += " board-space-disabled";
    }

    if(cell.isSelected) {
        overlayClassName += "board-space-overlay-selected";
    }

    const style = {
        background: cell.background,
    };

    const onClick = cell.isDisabled ? undefined : e => dispatch({
        type: "board.tile.click",
        position: new Position(x, y),
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
    });

    const onClose = () => dispatch({
        type: "board.tile.popup.close",
        position: new Position(x, y),
    });

    return (
        <>
            <div
                className={`board-space ${className}`}
                onClick={onClick}
                style={style}
                ref={anchorRef}>
                    <div className={`board-space-selected-overlay board-space-centered ${overlayClassName}`}>
                        {children}
                    </div>
            </div>
            <Popup opened={cell.popup && cell.showPopup} anchorRef={anchorRef} onClose={onClose}>
                {cell?.popup ?
                    <PopupContents popup={cell.popup} dispatch={dispatch}></PopupContents> : undefined}
            </Popup>
        </>
    );
}

function PopupContents({ popup, dispatch }) {
    return (
        <>
            <div className="unit-details-title-wrapper">
                <h2>{popup.title}</h2>
            </div>
            {popup.sections.map(section => (
                <>
                    <h3>{section.title}</h3>
                    <table>
                        {section.pairs.map(pair => (
                            <tr key={pair.title}>
                                <td>{pair.title}</td>
                                <td>{pair.value}</td>
                            </tr>
                        ))}
                    </table>
                </>
            ))}
            {popup.buttons ?
                <PopupButtons buttons={popup.buttons} dispatch={dispatch}></PopupButtons> : undefined}
        </>
    );
}

function PopupButtons({ buttons, dispatch }) {
    return (
        <div className="unit-details-take-action centered">
            {buttons.map((button, i) => {
                const click = () => dispatch({
                    type: button.dispatchType,
                });

                return (
                    <button key={i} onClick={click} disabled={!button.dispatchType}>{button.text}</button>
                );
            })}
        </div>
    );
}
