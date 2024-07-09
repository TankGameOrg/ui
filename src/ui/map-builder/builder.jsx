/* global alert, confirm, window */
import "./builder.css";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { clearSelection, copy, cut, deleteSelected, paste, resizeBoard, selectLocation, setMap, useMapBuilder } from "../../interface-adapters/map-builder/map-builder.js";
import { getGameVersion } from "../../versions/index.js";
import { AppContent } from "../app-content.jsx";
import { GameBoard } from "../game_state/board.jsx";
import { EditSpace, MetaEntityEditor } from "./edit-entity.jsx";
import { DELETE, ESCAPE, KEY_C, KEY_S, KEY_V, KEY_X, useGlobalKeyHandler } from "../generic/global-keybinds.js";
import { openFile, restorePreviousSession, SAVE_BUTTON_TEXT, SAVE_ON_CTRL_S } from "../../drivers/game-file-web.js";
import { ErrorMessage } from "../error_message.jsx";
import { CreateGameDialog } from "./create-map-dialog.jsx";
import { Tab, TabContent, Tabs } from "../generic/tabs.jsx";

function useMapBuilderKeyBinds(dispatch, saveChanges) {
    useGlobalKeyHandler((e) => {
        if(e.keyCode == ESCAPE) {
            dispatch(clearSelection());
        }
        else if(e.keyCode == DELETE) {
            deleteSelected(dispatch);
        }
        else if(e.ctrlKey && e.keyCode == KEY_X) {
            dispatch(cut());
        }
        else if(e.ctrlKey && e.keyCode == KEY_C) {
            dispatch(copy());
        }
        else if(e.ctrlKey && e.keyCode == KEY_V) {
            dispatch(paste());
        }
        else if(e.ctrlKey && e.keyCode == KEY_S) {
            e.preventDefault();
            if(SAVE_ON_CTRL_S) {
                saveChanges();
            }
        }
    }, [dispatch, saveChanges]);
}

function useBeforeNavigate(callback, deps = []) {
    callback = useCallback(callback, [callback].concat(deps));  // eslint-disable-line

    useEffect(() => {
        window.addEventListener("beforeunload", callback);
        return () => window.removeEventListener("beforeunload", callback);
    }, [callback]);
}

async function loadGameFile(isUnsaved, setIsUnsaved, setGameFile, setError) {
    if(isUnsaved && !confirm("You have unsaved changes.  Are you sure you want to lose them?")) {
        return;
    }

    setIsUnsaved(false);
    setError(undefined);
    setGameFile(undefined);

    try {
        setGameFile(await openFile())
    }
    catch(err) {
        setError(err);
    }
}

async function saveGameFile(gameFile, setIsUnsaved) {
    // Nothing to save
    if(gameFile === undefined) return;

    try {
        await gameFile.save();
        setIsUnsaved(false);
    }
    catch(err) {
        alert(`Failed to save: ${err.message}`);
    }
}

export function MapBuilder({ debug, navigate }) {
    const [createGameDialogOpen, setCreateGameDialogOpen] = useState(false);
    const [isUnsaved, setIsUnsaved] = useState(false);
    const [error, setError] = useState();
    const [gameFile, setGameFile] = useState();
    const [mapBuilderState, dispatch] = useMapBuilder();

    const versionConfig = gameFile?.getData?.()?.gameVersion !== undefined ?
        getGameVersion(gameFile?.getData?.().gameVersion) : undefined;

    const builderConfig = versionConfig?.getBuilderConfig?.();

    useEffect(() => {
        if(gameFile && builderConfig) {
            dispatch(setMap(gameFile.getData(), builderConfig, map => {
                setIsUnsaved(true);
                gameFile.setData(map);
            }));
        }
    }, [gameFile, dispatch, builderConfig]);

    const saveChanges = useCallback(() => saveGameFile(gameFile, setIsUnsaved), [gameFile, setIsUnsaved]);

    useBeforeNavigate(() => {
        return isUnsaved ? "You have unsaved changes save them before closing the window" : "";
    }, [isUnsaved]);

    const toolBarButtons = (
        <>
            <button onClick={() => navigate("home")}>Back to games</button>
            <button onClick={() => loadGameFile(isUnsaved, setIsUnsaved, setGameFile, setError)}>Open Map</button>
            <button onClick={() => setCreateGameDialogOpen(true)}>New Map</button>
        </>
    );

    const createGameDialog = <CreateGameDialog
        open={createGameDialogOpen}
        setOpen={setCreateGameDialogOpen}
        setGameFile={setGameFile}
        setIsUnsaved={setIsUnsaved}
        isUnsaved={isUnsaved}></CreateGameDialog>;

    if(error !== undefined) {
        return <AppContent>
            <div className="map-builder-toolbar">
                {toolBarButtons}
            </div>
            <ErrorMessage error={error}></ErrorMessage>
            {createGameDialog}
        </AppContent>;
    }

    if(gameFile === undefined) {
        return <AppContent>
            <div className="map-builder-toolbar">
                {toolBarButtons}
            </div>
            <p>Open or create a game file to get started</p>
            <RestoreUnsavedGame setGameFile={setGameFile} setError={setError} setIsUnsaved={setIsUnsaved}></RestoreUnsavedGame>
            {createGameDialog}
        </AppContent>;
    }

    return <MapBuilderEditor
        mapBuilderState={mapBuilderState}
        dispatch={dispatch}
        toolBarButtons={toolBarButtons}
        isUnsaved={isUnsaved}
        createGameDialog={createGameDialog}
        saveChanges={saveChanges}
        versionConfig={versionConfig}
        debug={debug}></MapBuilderEditor>
}

function MapBuilderEditor({ mapBuilderState, toolBarButtons, isUnsaved, createGameDialog, dispatch, saveChanges, versionConfig, debug, builderConfig }) {
    const [selectionMode, setSelectionMode] = useState(false);

    useMapBuilderKeyBinds(dispatch, saveChanges);

    const hasSelection = mapBuilderState.locationSelector.locations?.length > 0;
    const hasClipboard = mapBuilderState.clipboard !== undefined;

    const selectLocationHandler = (location, keys) => {
        let mode = "select-space";
        if(keys.ctrlKey) mode = "toggle-space";
        if(keys.shiftKey || selectionMode ) mode = "select-area";
        if(keys.ctrlKey && keys.shiftKey) mode = "select-addtional-area"

        setSelectionMode(false);
        dispatch(selectLocation(location, mode));
    };

    const toolBar = (
        <div className="map-builder-toolbar">
            {toolBarButtons}
            <button disabled={!isUnsaved} onClick={saveChanges} className="map-builder-save-btn">{SAVE_BUTTON_TEXT}</button>
            <button disabled={!hasSelection && !hasClipboard} onClick={() => dispatch(clearSelection())}>Clear Selection/clipboard</button>
            <button disabled={!hasSelection} onClick={() => setSelectionMode(true)}>Select Rectangle</button>
            <button disabled={!hasSelection} onClick={() => deleteSelected(dispatch)}>Delete Selected</button>
            <button disabled={!hasSelection} onClick={() => dispatch(cut())}>Cut</button>
            <button disabled={!hasSelection} onClick={() => dispatch(copy())}>Copy</button>
            <button
                disabled={!hasSelection || !hasClipboard || !mapBuilderState?.clipboard?.canPaste}
                onClick={() => dispatch(paste())}>
                    Paste
            </button>
        </div>
    );

    return (
        <>
            <div className="app-sidebar">
                <div className="map-builder-edit-pane">
                    <Tabs defaultTab="entity-floor">
                        <div>
                            <Tab name="entity-floor">Entity/Floor</Tab>
                            <Tab name="meta-entities">Meta Entities</Tab>
                        </div>
                        <TabContent name="entity-floor">
                            <EditSpace mapBuilderState={mapBuilderState} dispatch={dispatch} builderConfig={builderConfig}></EditSpace>
                        </TabContent>
                        <TabContent name="meta-entities">
                            <MetaEntityEditor mapBuilderState={mapBuilderState} dispatch={dispatch} builderConfig={builderConfig}></MetaEntityEditor>
                        </TabContent>
                    </Tabs>
                </div>
            </div>
            <AppContent withSidebar debugMode={debug} toolbar={toolBar}>
                {createGameDialog}
                <div className="map-builder-map-wrapper">
                    {mapBuilderState?.errorMessage ?
                        <div className="message warning">{mapBuilderState?.errorMessage}</div> : undefined}
                    <div class="centered map-builder-resize-board-buttons">
                        <button onClick={() => dispatch(resizeBoard({ top: 1 }))} disabled={!mapBuilderState?.resizeBoard?.canGrowY}>Grow</button>
                        <button onClick={() => dispatch(resizeBoard({ top: -1 }))} disabled={!mapBuilderState?.resizeBoard?.canShrinkY}>Shrink</button>
                    </div>
                    <div className="map-builder-map-inner-wrapper">
                        <div class="centered map-builder-side-resize map-builder-resize-board-buttons">
                            <button onClick={() => dispatch(resizeBoard({ left: 1 }))} disabled={!mapBuilderState?.resizeBoard?.canGrowX}>Grow</button>
                            <button onClick={() => dispatch(resizeBoard({ left: -1 }))} disabled={!mapBuilderState?.resizeBoard?.canShrinkX}>Shrink</button>
                        </div>
                        <GameBoard
                            board={mapBuilderState?.map?.initialGameState?.board}
                            config={versionConfig}
                            canSubmitAction={false}
                            locationSelector={mapBuilderState.locationSelector}
                            selectLocation={selectLocationHandler}
                            cutSelection={mapBuilderState?.clipboard?.getCutLocations?.()}></GameBoard>
                        <div class="centered map-builder-side-resize map-builder-resize-board-buttons">
                            <button onClick={() => dispatch(resizeBoard({ right: 1 }))} disabled={!mapBuilderState?.resizeBoard?.canGrowX}>Grow</button>
                            <button onClick={() => dispatch(resizeBoard({ right: -1 }))} disabled={!mapBuilderState?.resizeBoard?.canShrinkX}>Shrink</button>
                        </div>
                    </div>
                    <div class="centered map-builder-resize-board-buttons">
                        <button onClick={() => dispatch(resizeBoard({ bottom: 1 }))} disabled={!mapBuilderState?.resizeBoard?.canGrowY}>Grow</button>
                        <button onClick={() => dispatch(resizeBoard({ bottom: -1 }))} disabled={!mapBuilderState?.resizeBoard?.canShrinkY}>Shrink</button>
                    </div>
                </div>
            </AppContent>
        </>
    );
}

function RestoreUnsavedGame({ setGameFile, setError, setIsUnsaved }) {
    const [previousSession, setPreviousSession] = useState();

    useEffect(() => {
        setPreviousSession(restorePreviousSession());
    }, [setPreviousSession]);

    // Nothing to restore
    if(!previousSession) return;

    const restoreSession = () => {
        setGameFile(previousSession.gameFile);
        setError(undefined);
        setIsUnsaved(previousSession.unsaved);
    };

    const unsavedMsg = previousSession.unsaved ? " (unsaved)" : "";

    return (
        <button onClick={restoreSession}>Restore previous session{unsavedMsg}</button>
    );
}