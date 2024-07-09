import { useState } from "preact/hooks";
import { clearSelection, copy, cut, deleteSelected, paste, resizeBoard, selectLocation } from "../../interface-adapters/map-builder/map-builder.js";
import { SAVE_BUTTON_TEXT } from "../../drivers/game-file-web.js";
import { Tab, TabContent, Tabs } from "../generic/tabs.jsx";
import { EditSpace, MetaEntityEditor } from "./edit-entity.jsx";
import { AppContent } from "../app-content.jsx";
import { GameBoard } from "../game_state/board.jsx";
import { PlayerEditor } from "./player-editor.jsx";


export function MapBuilderEditor({ mapBuilderState, toolBarButtons, isUnsaved, createGameDialog, dispatch, saveChanges, versionConfig, debug, builderConfig }) {
    const [selectionMode, setSelectionMode] = useState(false);

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
                            <Tab name="players">Players</Tab>
                        </div>
                        <TabContent name="entity-floor">
                            <EditSpace mapBuilderState={mapBuilderState} dispatch={dispatch} builderConfig={builderConfig}></EditSpace>
                        </TabContent>
                        <TabContent name="meta-entities">
                            <MetaEntityEditor mapBuilderState={mapBuilderState} dispatch={dispatch} builderConfig={builderConfig}></MetaEntityEditor>
                        </TabContent>
                        <TabContent name="players">
                            <PlayerEditor mapBuilderState={mapBuilderState} dispatch={dispatch} builderConfig={builderConfig}></PlayerEditor>
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
