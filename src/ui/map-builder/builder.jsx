/* global alert, confirm, window */
import "./builder.css";
import { useCallback, useEffect, useState } from "preact/hooks";
import { clearSelection, copy, cut, deleteSelected, paste, resizeBoard, selectLocation, setMap, useMapBuilder } from "../../interface-adapters/map-builder/map-builder.js";
import { getGameVersion } from "../../versions/index.js";
import { AppContent } from "../app-content.jsx";
import { DELETE, ESCAPE, KEY_C, KEY_O, KEY_S, KEY_V, KEY_X, useGlobalKeyHandler } from "../generic/global-keybinds.js";
import { openFile, restorePreviousSession, SAVE_ON_CTRL_S } from "../../drivers/game-file-web.js";
import { ErrorMessage } from "../error_message.jsx";
import { CreateGameDialog } from "./create-map-dialog.jsx";
import { MapBuilderEditor } from "./editor.jsx";

function useMapBuilderKeyBinds(dispatch, loadFile, saveChanges) {
    useGlobalKeyHandler((e) => {
        if(e.ctrlKey && e.keyCode == KEY_O) {
            e.preventDefault();
            loadFile();
        }
        else if(e.keyCode == ESCAPE) {
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

export function MapBuilder({ debug }) {
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

    const loadFile = useCallback(
        () => loadGameFile(isUnsaved, setIsUnsaved, setGameFile, setError),
        [isUnsaved, setIsUnsaved, setGameFile, setError]);

    const saveChanges = useCallback(
        () => saveGameFile(gameFile, setIsUnsaved),
        [gameFile, setIsUnsaved]);

    useBeforeNavigate(() => {
        return isUnsaved ? "You have unsaved changes save them before closing the window" : "";
    }, [isUnsaved]);

    useMapBuilderKeyBinds(dispatch, loadFile, saveChanges);

    const toolBarButtons = (
        <>
            <button onClick={loadFile}>Open Map</button>
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
        loadFile={loadFile}
        saveChanges={saveChanges}
        versionConfig={versionConfig}
        debug={debug}></MapBuilderEditor>
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