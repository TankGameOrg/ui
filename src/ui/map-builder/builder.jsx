import "./builder.css";
import { useEffect, useState } from "preact/hooks";
import { useMap } from "../../drivers/rest/fetcher.js";
import { clearSelection, copy, cut, deleteSelected, paste, resizeBoard, selectLocation, setMap, useMapBuilder } from "../../interface-adapters/map-builder/map-builder.js";
import { getGameVersion } from "../../versions/index.js";
import { AppContent } from "../app-content.jsx";
import { ErrorMessage } from "../error_message.jsx";
import { GameBoard } from "../game_state/board.jsx";
import { EditSpace } from "./edit-entity.jsx";
import { DELETE, ESCAPE, KEY_C, KEY_V, KEY_X, useGlobalKeyHandler } from "../generic/global-keybinds.js";

function useMapBuilderKeyBinds(dispatch) {
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
    }, [dispatch]);
}

export function MapBuilder({ mapName, debug, navigate }) {
    const [mapBuilderState, dispatch] = useMapBuilder();
    const [map, error] = useMap(mapName);

    const versionConfig = map?.game?.gameVersion !== undefined ?
        getGameVersion(map.game.gameVersion) : undefined;

    const builderConfig = versionConfig?.getBuilderConfig?.();

    useEffect(() => {
        if(map) dispatch(setMap(map, builderConfig));
    }, [map, dispatch, builderConfig]);

    const [selectionMode, setSelectionMode] = useState(false);

    useMapBuilderKeyBinds(dispatch);

    const backToGamesButton = <button onClick={() => navigate("home")}>Back to games</button>;

    if(error?.code == "game-loading") {
        return <AppContent>
            {backToGamesButton}
            <p>Loading Game...</p>
        </AppContent>;
    }

    if(error) {
        return <AppContent>
            {backToGamesButton}
            <ErrorMessage error={error}></ErrorMessage>
        </AppContent>;
    }

    const hasSelection = mapBuilderState.locationSelector.locations?.length > 0;
    const hasClipBoard = mapBuilderState.clipBoard !== undefined;

    const toolBar = (
        <>
            {backToGamesButton}
            <button disabled={!hasSelection && !hasClipBoard} onClick={() => dispatch(clearSelection())}>Clear Selection/clipboard</button>
            <button disabled={!hasSelection} onClick={() => setSelectionMode(true)}>Select Rectangle</button>
            <button disabled={!hasSelection} onClick={() => deleteSelected(dispatch)}>Delete Selected</button>
            <button disabled={!hasSelection} onClick={() => dispatch(cut())}>Cut</button>
            <button disabled={!hasSelection} onClick={() => dispatch(copy())}>Copy</button>
            <button
                disabled={!hasSelection || !hasClipBoard || !mapBuilderState?.canPaste}
                onClick={() => dispatch(paste())}>
                    Paste
            </button>
        </>
    );

    const selectLocationHandler = (location, keys) => {
        let mode = "select-space";
        if(keys.ctrlKey) mode = "toggle-space";
        if(keys.shiftKey || selectionMode ) mode = "select-area";
        if(keys.ctrlKey && keys.shiftKey) mode = "select-addtional-area"

        setSelectionMode(false);
        dispatch(selectLocation(location, mode));
    };

    return (
        <>
            <div className="app-sidebar">
                <div className="map-builder-edit-pane">
                    <EditSpace mapBuilderState={mapBuilderState} dispatch={dispatch} builderConfig={builderConfig}></EditSpace>
                </div>
            </div>
            <AppContent withSidebar debugMode={debug} toolbar={toolBar} buildInfo={map?.buildInfo}>
                <div className="map-builder-map-wrapper">
                    {mapBuilderState?.pasteErrorMessage ?
                        <div className="message warning">{mapBuilderState?.pasteErrorMessage}</div> : undefined}
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
                            board={mapBuilderState?.initialState?.board}
                            config={versionConfig}
                            canSubmitAction={false}
                            locationSelector={mapBuilderState.locationSelector}
                            selectLocation={selectLocationHandler}
                            cutSelection={mapBuilderState?.clipBoard?.getCutLocations?.()}></GameBoard>
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
