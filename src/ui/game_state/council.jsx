import { prettyifyName } from "../../utils.js";
import { AttributeList } from "./attribute-list.jsx";
import "./council.css";

const EXCLUDED_ATTRIBUTES = new Set(["armistice"]);

export function Council({ gameState, config, setSelectedUser, canSubmitAction }) {
    if(!gameState || !config) {
        return "Loading...";
    }

    return (
        <>
            <ArmisticeClock armistice={gameState.metaEntities.council.armistice}></ArmisticeClock>
            <AttributeList attributes={gameState.metaEntities.council} versionConfig={config} excludedAttributes={EXCLUDED_ATTRIBUTES}></AttributeList>
            <div className="user-list">
                <Section
                    key="councilors"
                    name="Councilors"
                    users={gameState.metaEntities.council.councilors}
                    canSubmitAction={canSubmitAction}
                    setSelectedUser={setSelectedUser}
                    gameState={gameState}></Section>
                <Section
                    key="senators"
                    name="Senators"
                    users={gameState.metaEntities.council.senators}
                    canSubmitAction={canSubmitAction}
                    setSelectedUser={setSelectedUser}
                    gameState={gameState}></Section>
            </div>
        </>
    )
}


function Section({ name, users, setSelectedUser, canSubmitAction, gameState }) {
    if(users === undefined || users.length === 0) return;

    return (
        <>
            <h3>{prettyifyName(name)}</h3>
            <ul>
                {users.map(userRef => {
                    const user = userRef.getPlayer(gameState);
                    const entities = gameState.getEntitiesByPlayer(user);
                    const hasEntitiesOnBoard = entities.find(entity => entity.position !== undefined);
                    const actionButton = !hasEntitiesOnBoard && canSubmitAction ? (
                        <button onClick={() => setSelectedUser(user.name)} className="council-action-button">
                            Take Action
                        </button>
                    ) : undefined;

                    return <li key={user.name}>{user.name}{actionButton}</li>
                })}
            </ul>
        </>
    );
}


function ArmisticeClock({ armistice }) {
    // We're on a pre armistice version of the game
    if(!armistice) return;

    const armisticePercent = Math.max(0, Math.min(1, armistice.value / armistice.max));
    const radius = 45;

    // Find the circumference of the circle
    const fullCircle = Math.ceil(radius * 2 * Math.PI);

    // Calculate the portion of the circumference that we want to show and hide
    const dashPercent = armisticePercent * fullCircle;
    const dashArray = `${dashPercent} ${fullCircle - dashPercent}`;

    // Start from the top of the circle not the far right
    const startPosition = fullCircle / 4;

    return (
        <>
            <h3>Armistice Votes</h3>
            <svg height="100" width="100" viewBox="0 0 100 100" className="armistice-clock">
                <circle cx="50" cy="50" r={radius} stroke-dasharray={dashArray} stroke-dashoffset={startPosition}/>
                <text x="50" y="50" dominant-baseline="middle" text-anchor="middle">
                    {armistice.value} / {armistice.max}
                </text>
            </svg>
        </>
    )
}
