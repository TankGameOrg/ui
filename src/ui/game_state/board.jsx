import "./board.css";
import { Position } from "../../game/state/board/position.js";
import { UnitTile } from "./unit-tile.jsx";
import { useRef, useState } from "preact/hooks";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../utils.js";
import { AttributeList } from "./attribute-list.jsx";


export function GameBoard({ gameState, config, setSelectedUser, canSubmitAction, locationSelector, selectLocation, cutSelection, animationData, emptyMessage = "No board data supplied" }) {
    if(!gameState?.board) return <p>{emptyMessage}</p>;

    try {
        return (
            <GameBoardView
                gameState={gameState}
                animationData={animationData}
                config={config}
                canSubmitAction={canSubmitAction}
                setSelectedUser={setSelectedUser}
                locationSelector={locationSelector}
                selectLocation={selectLocation}
                cutSelection={cutSelection}></GameBoardView>
        );
    }
    catch(err) {
        return (
            <p>Failed to render board: {err.message}</p>
        );
    }
}

export function GameBoardView({ gameState, config, setSelectedUser, canSubmitAction, locationSelector, selectLocation, cutSelection, animationData }) {
    const selectedTargets = (locationSelector.locations || []);
    const {board} = gameState;

    if(cutSelection === undefined) {
        cutSelection = [];
    }

    let letters = [<Tile key="empty-coord" className="board-space-coordinate"></Tile>];
    for(let x = 0; x < board.width; ++x) {
        const letter = new Position(x, 0).humanReadableX;
        letters.push(<Tile key={`coord-x-${x}`} className="board-space-coordinate">{letter}</Tile>);
    }

    let renderedBoard = [<div key="coords-row" className="game-board-row">{letters}</div>];

    for(let y = 0; y < board.height; ++y) {
        let renderedRow = [<Tile key={`coord-y-${y}`} className="board-space-coordinate">{y + 1}</Tile>];

        for(let x = 0; x < board.width; ++x) {
            const position = new Position(x, y);
            const disabled = locationSelector.isSelecting &&
                !locationSelector.selectableLocations.includes(position.humanReadable);
            const isCut = cutSelection.includes(position.humanReadable);

            const onClick = locationSelector.isSelecting && !disabled ? (e) => {
                selectLocation(position.humanReadable, {
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                });
            } : undefined;

            renderedRow.push(
                <Space
                    animationData={animationData}
                    unit={board.getUnitAt(position)}
                    floorTile={board.getFloorTileAt(position)}
                    onClick={onClick}
                    disabled={disabled}
                    selected={selectedTargets.includes(position.humanReadable)}
                    config={config}
                    canSubmitAction={canSubmitAction}
                    setSelectedUser={setSelectedUser}
                    isCut={isCut}
                    gameState={gameState}></Space>
            );
        }

        renderedBoard.push(<div className="game-board-row">{renderedRow}</div>);
    }

    return (
        <div className="game-board">{renderedBoard}</div>
    )
}

function Space({ unit, floorTile, disabled, onClick, selected, config, setSelectedUser, canSubmitAction, isCut, gameState, animationData }) {
    let tile = null;

    // Try to place an unit in this space
    if(unit && unit.type != "empty") {
        tile = <UnitTile
            unit={unit}
            showPopupOnClick={!(onClick || disabled)}
            config={config}
            canSubmitAction={canSubmitAction}
            setSelectedUser={setSelectedUser}
            gameState={gameState}
            animationData={animationData}></UnitTile>;
    }

    return (
        <Tile floorTile={floorTile} disabled={disabled} onClick={onClick} selected={selected} config={config} isCut={isCut}>
            {tile}
        </Tile>
    );
}

function Tile({ className = "", children, floorTile, disabled, onClick, selected, config, isCut } = {}) {
    const [popupOpen, setPopupOpen] = useState(false);
    const anchorRef = useRef();

    if(onClick) {
        className += " board-space-selectable";
    }

    if(isCut) {
        className += " board-space-cut";
    }

    let style = {};
    if(floorTile) {
        if(config && floorTile.type != "empty") {
            const descriptor = config.getFloorTileDescriptor(floorTile);
            style.background = descriptor.getBackground();
        }

        if(!onClick && !disabled && floorTile.type !== "empty" && children === null) {
            onClick = () => setPopupOpen(popupOpen => !popupOpen);
        }
        else if(popupOpen) {
            // We're doing something else with this space hide the popup
            setPopupOpen(false);
        }
    }

    if(disabled) {
        className += " board-space-disabled";
    }

    return (
        <>
            <div
                className={`board-space ${className}`}
                onClick={onClick}
                style={style}
                ref={anchorRef}>
                    <div className={`board-space-selected-overlay board-space-centered ${selected ? "board-space-overlay-selected" : ""}`}>
                        {children}
                    </div>
            </div>
            <Popup opened={popupOpen} anchorRef={anchorRef} onClose={() => setPopupOpen(false)}>
                <div className="unit-details-title-wrapper">
                    <h2>{prettyifyName(floorTile?.type)}</h2>
                </div>
                <AttributeList attributes={floorTile} versionConfig={config}></AttributeList>
            </Popup>
        </>
    );
}