import { GameBoard } from "./game_state/board.jsx";
import { LogEntrySelector } from "./game_state/log_entry_selector.jsx"
import { SubmitTurn } from "./game_state/submit-turn/submit-turn.jsx";
import { LogBook } from "./game_state/log_book.jsx";
import { ErrorMessage } from "./error_message.jsx";
import { OpenHours } from "./open-hours.jsx";
import { AppContent } from "./app-content.jsx";
import { GameManual } from "./game-manual.jsx";
import { goToEntryId, goToLatestTurn, useCurrentTurnManager } from "../interface-adapters/current-turn-manager.js";
import { selectLocation, setSubject, useBuildTurn } from "../interface-adapters/build-turn.js";
import { getGameClient, useGameClient, usePollingFor } from "../drivers/rest/game-client.js";
import { closeAllPopups, importBoard, selectCell, showPopup, startSelecting, stopSelecting } from "../interface-adapters/game/board/reducer.js";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useMemo } from "preact/hooks";
import { Position } from "../game/state/board/position.js";
import { getSelected } from "../interface-adapters/game/board/state.js";


export function Game({ game, navigate, debug }) {
    // usePollingFor(game, 2 /* refresh every 2 seconds */);
    const [gameInfo, infoError] = useGameClient(game, client => client.getGameInfo());

    const [currentTurnMgrState, distachLogEntryMgr] = useCurrentTurnManager(gameInfo?.logBook);
    const [builtTurnState, buildTurnDispatch] = useBuildTurn();

    const canSubmitAction = gameInfo?.game?.state == "running";

    const newState = useSelector(state => state.board);
    const dispatchBoard = useDispatch();
    useEffect(() => dispatchBoard(importBoard(game, currentTurnMgrState, gameInfo?.logBook, canSubmitAction)),
        [game, currentTurnMgrState, gameInfo?.logBook, canSubmitAction, dispatchBoard]);

    const error = infoError;

    const setSelectedUser = user => {
        buildTurnDispatch(setSubject(user));
        distachLogEntryMgr(goToLatestTurn());
    };


    // Bind the board state to the turn builder
    const hasBoard = newState?.board !== undefined;
    useEffect(() => {
        if(!hasBoard) return;

        if(builtTurnState.locationSelector.isSelecting) {
            dispatchBoard(startSelecting({
                selectable: builtTurnState.locationSelector.selectableLocations
                    .map(positionStr => new Position(positionStr)),
            }));
        }
        else {
            dispatchBoard(stopSelecting());
        }
    }, [builtTurnState.locationSelector.isSelecting, builtTurnState.locationSelector.selectableLocations, dispatchBoard, hasBoard]);

    const boardCellClick = useCallback(e => {
        if(newState.isSelecting) {
            dispatchBoard(selectCell(e.position));
        }
        else {
            dispatchBoard(showPopup({ position: e.position }));
        }
    }, [dispatchBoard, newState.isSelecting]);

    const currentSelection = useMemo(() => newState.isSelecting ? getSelected(newState.board)[0]?.humanReadable : undefined, [newState]);
    useEffect(() => {
        buildTurnDispatch(selectLocation(currentSelection));
    }, [currentSelection, buildTurnDispatch]);


    const debugButtons = (
        <>
            <button onClick={() => navigate("backstage")}>Backstage</button>
            <button onClick={() => getGameClient(game).reloadGame()}>Reload game</button>
        </>
    );

    const toolbarButtons = <>
        <button onClick={() => navigate("home")}>Back to games</button>
        {debug ? debugButtons : undefined}
    </>;

    // The backend is still loading the game
    if(error?.code == "game-loading") {
        return <AppContent>
            {toolbarButtons}
            <p>Loading Game...</p>
        </AppContent>;
    }

    if(error) {
        return <AppContent>
            {toolbarButtons}
            <ErrorMessage error={error}></ErrorMessage>
        </AppContent>;
    }

    let gameMessage;
    if(gameInfo !== undefined && gameInfo.game?.state != "running") {
        const colorClass = gameInfo.game?.state == "game-over" ? "success" : "warning";

        gameMessage = <div className={`${colorClass} message`}>{gameInfo.game?.statusText}</div>;
    }

    const toolBar = (
        <LogEntrySelector
            extraButtonsLeft={toolbarButtons}
            debug={debug}
            logBook={gameInfo?.logBook}
            currentTurnMgrState={currentTurnMgrState}
            distachLogEntryMgr={distachLogEntryMgr}></LogEntrySelector>
    );

    return (
        <>
            <div className="app-sidebar">
                <LogBook
                    logBook={gameInfo?.logBook}
                    currentEntryId={currentTurnMgrState.entryId}
                    changeEntryId={entryId => distachLogEntryMgr(goToEntryId(entryId))}></LogBook>
            </div>
            <AppContent withSidebar debugMode={debug} toolbar={toolBar} buildInfo={gameInfo?.buildInfo} engineInfo={gameInfo?.engineInfo}>
                <div className="app-side-by-side centered">
                    <div className="app-side-by-side-main">
                        {gameMessage !== undefined ? <div>{gameMessage}</div> : undefined}
                        <GameBoard
                            boardState={newState?.board}
                            locationSelector={builtTurnState.locationSelector}
                            onClickCell={boardCellClick}
                            onPopupClose={e => dispatchBoard(closeAllPopups({ position: e.position }))}
                            onButtonClick={e => setSelectedUser(e.button.subject)}></GameBoard>
                    </div>
                    <div>
                        {/* <Council
                            gameState={gameState}
                            setSelectedUser={setSelectedUser}
                            canSubmitAction={canSubmitAction}></Council> */}
                        <OpenHours openHours={gameInfo?.openHours} debug={debug}></OpenHours>
                        {/* <CooldownList gameState={gameState}></CooldownList> */}
                        <GameManual gameVersion={gameInfo?.game?.gameVersion}></GameManual>
                    </div>
                </div>
                <div className="centered">
                    <div>
                        {canSubmitAction ? <SubmitTurn
                            game={game}
                            builtTurnState={builtTurnState}
                            buildTurnDispatch={buildTurnDispatch}
                            canSubmitAction={canSubmitAction}
                            debug={debug}
                            isLatestEntry={currentTurnMgrState.isLatestEntry}
                            allowManualRolls={gameInfo?.gameSettings?.allowManualRolls}></SubmitTurn> : undefined}
                    </div>
                </div>
            </AppContent>
        </>
    );
}