import { GameBoard } from "./game_state/board.jsx";
import { useMemo } from "preact/hooks";
import { LogEntrySelector } from "./game_state/log_entry_selector.jsx"
import { SubmitTurn } from "./game_state/submit-turn/submit-turn.jsx";
import { Council } from "./game_state/council.jsx";
import { LogBook } from "./game_state/log_book.jsx";
import { ErrorMessage } from "./error_message.jsx";
import { OpenHours } from "./open-hours.jsx";
import { AppContent } from "./app-content.jsx";
import { GameManual } from "./game-manual.jsx";
import { goToEntryId, goToLatestTurn, useCurrentTurnManager } from "../interface-adapters/current-turn-manager.js";
import { getGameVersion } from "../versions/index.js";
import { selectLocation, setSubject, useBuildTurn } from "../interface-adapters/build-turn.js";
import { CooldownList } from "./game_state/cooldown-list.jsx";
import { getGameClient, useGameClient, usePollingFor } from "../drivers/rest/game-client.js";


export function Game({ game, navigate, debug }) {
    usePollingFor(game, 2 /* refresh every 2 seconds */);
    const [gameInfo, infoError] = useGameClient(game, client => client.getGameInfo());

    const [currentTurnMgrState, distachLogEntryMgr] = useCurrentTurnManager(gameInfo?.logBook);
    const [gameState, stateError] = useGameClient(game,
            client => currentTurnMgrState.entryId !== undefined && client.getGameState(currentTurnMgrState.entryId), [currentTurnMgrState.entryId])

    const [builtTurnState, buildTurnDispatch] = useBuildTurn();

    const versionConfig = gameInfo?.game?.gameVersion !== undefined ?
        getGameVersion(gameInfo.game.gameVersion) : undefined;

    const possibleActionsContext = useMemo(() => ({
        gameState,
        versionConfig,
    }), [gameState, versionConfig]);

    const error = infoError || stateError;
    const canSubmitAction = gameInfo?.game?.state == "running";

    const setSelectedUser = user => {
        buildTurnDispatch(setSubject(user));
        distachLogEntryMgr(goToLatestTurn());
    };

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
                            gameState={gameState}
                            config={versionConfig}
                            canSubmitAction={canSubmitAction}
                            setSelectedUser={setSelectedUser}
                            locationSelector={builtTurnState.locationSelector}
                            selectLocation={location => buildTurnDispatch(selectLocation(location))}></GameBoard>
                    </div>
                    <div>
                        <Council
                            gameState={gameState}
                            config={versionConfig}
                            setSelectedUser={setSelectedUser}
                            canSubmitAction={canSubmitAction}></Council>
                        <OpenHours openHours={gameInfo?.openHours} debug={debug}></OpenHours>
                        <CooldownList gameState={gameState} versionConfig={versionConfig}></CooldownList>
                        <GameManual manualPath={versionConfig?.getManual?.()}></GameManual>
                    </div>
                </div>
                <div className="centered">
                    <div>
                        {canSubmitAction ? <SubmitTurn
                            context={possibleActionsContext}
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