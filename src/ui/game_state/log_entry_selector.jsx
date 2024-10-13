import "./log_entry_selector.css";
import { goToLatestTurn, goToNextDay, goToNextEntry, goToPreviousDay, goToPreviousEntry, togglePlayback } from "../../interface-adapters/current-turn-manager";

export function LogEntrySelector({ currentTurnMgrState, distachLogEntryMgr, debug, extraButtonsLeft }) {
    if(currentTurnMgrState.entryId === undefined) {
        return (
            <div className="turn-selector">
                Loading...
            </div>
        )
    }

    return (
        <LogEntrySelectorInternal
            currentTurnMgrState={currentTurnMgrState}
            distachLogEntryMgr={distachLogEntryMgr}
            debug={debug}
            extraButtonsLeft={extraButtonsLeft}></LogEntrySelectorInternal>
    )
}

function LogEntrySelectorInternal({ currentTurnMgrState, distachLogEntryMgr, debug, extraButtonsLeft }) {
    // Build the day relative header
    let turnText = `day: ${currentTurnMgrState.today} turn: ${currentTurnMgrState.dayRelativeEntryId} / ${currentTurnMgrState.maxEntryIdToday}`;

    if(debug) turnText += ` (turnId: ${currentTurnMgrState.entryId})`;


    let playbackButtonText;
    if(!currentTurnMgrState.canGoTo.latestTurn) {
        playbackButtonText = "Play from start";
    }
    else if(currentTurnMgrState.playbackInProgress) {
        playbackButtonText = "Pause playback";
    }
    else {
        playbackButtonText = "Playback turns";
    }

    return (
        <div className="turn-selector centered">
            {extraButtonsLeft}
            <button onClick={() => distachLogEntryMgr(togglePlayback())}>{playbackButtonText}</button>
            <button
                onClick={() => distachLogEntryMgr(goToPreviousDay())}
                disabled={!currentTurnMgrState.canGoTo.previousDay}>
                    &lt;&lt; Day
            </button>
            <button
                onClick={() => distachLogEntryMgr(goToPreviousEntry())}
                disabled={!currentTurnMgrState.canGoTo.previousTurn}>
                    &lt; Turn
            </button>
            <span className="turn-selector-turn-text">{turnText}</span>
            <button
                onClick={() => distachLogEntryMgr(goToNextEntry())}
                disabled={!currentTurnMgrState.canGoTo.nextTurn}>
                    Turn &gt;
            </button>
            <button
                onClick={() => distachLogEntryMgr(goToNextDay())}
                disabled={!currentTurnMgrState.canGoTo.nextDay}>
                    Day &gt;&gt;
            </button>
            <button
                onClick={() => distachLogEntryMgr(goToLatestTurn())}
                disabled={!currentTurnMgrState.canGoTo.latestTurn}>
                    Latest Turn
            </button>
        </div>
    );
}