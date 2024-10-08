import { useCallback, useMemo, useRef, useState } from "preact/hooks";
import "./unit-tile.css";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../utils.js";
import { AttributeList } from "./attribute-list.jsx";


function UnitDetails({ descriptor, unit, setSelectedUser, canSubmitAction, closePopup, versionConfig, gameState }) {
    const title = prettyifyName(descriptor.getName() || unit.type);

    const takeActionHandler = (player) => {
        setSelectedUser(player.name);
        closePopup();
    };

    let takeActionButtons;
    if(canSubmitAction && unit.playerRef) {
        const player = unit.playerRef.getPlayer(gameState);

        takeActionButtons =  (
            <div className="unit-details-take-action centered" key={player.name}>
                <button onClick={takeActionHandler.bind(undefined, player)}>Take Action</button>
            </div>
        );
    }

    const attributes = useMemo(() => {
        let allAttributes = unit;

        if(unit.playerRef) {
            const player = unit.playerRef.getPlayer(gameState);
            allAttributes = Object.assign({}, allAttributes, player);
        }

        return allAttributes;
    }, [unit, gameState]);

    return (
        <>
            <div className="unit-details-title-wrapper">
                <h2>{title}</h2>
            </div>
            <AttributeList attributes={attributes} versionConfig={versionConfig}></AttributeList>
            {takeActionButtons}
        </>
    )
}


function getBadgesForUnit(descriptor) {
    const badgeAttribute = descriptor.getBadge();

    const rightBadge = badgeAttribute !== undefined ? (
        <div className="board-space-unit-badge right-badge" style={badgeAttribute.style}>
            {badgeAttribute.text}
        </div>
    ): undefined;

    const indicators = descriptor.getIndicators()
        .map(indicator => <span key={indicator.symbol} style={indicator.style}>{indicator.symbol}</span>);

    const leftBadge = indicators.length > 0 ? (
        <div className="board-space-unit-badge left-badge" style={{ background: descriptor.getIndicatorBackground() }}>
            {indicators}
        </div>
    ): undefined;

    return <div className="board-space-unit-badges">{leftBadge}<div className="separator"></div>{rightBadge}</div>;
}


export function UnitTile({ unit, showPopupOnClick, config, setSelectedUser, canSubmitAction, gameState }) {
    const cardRef = useRef();
    const [opened, setOpened] = useState(false);

    const close = useCallback(() => setOpened(false), [setOpened]);

    const descriptor = config && config.getUnitDescriptor(unit, gameState);
    if(!descriptor) return;

    const tileStyles = descriptor.getTileStyle().style;
    const badges = getBadgesForUnit(descriptor);

    const label = descriptor.getName() !== undefined ? (
        <div className="board-space-unit-title board-space-centered">
            <div className="board-space-unit-title-inner">{prettyifyName(descriptor.getName())}</div>
        </div>
    ) : (
        <div className="board-space-unit-title-placeholder"></div>
    );

    return (
        <div className="board-space-unit-wrapper">
            <div className="board-space-unit" ref={cardRef} onClick={() => showPopupOnClick && setOpened(open => !open)} style={tileStyles}>
                {label}
                <div className="board-space-centered board-space-attribute-featured">
                    {descriptor.getFeaturedAttribute()}
                </div>
                {badges}
            </div>
            <Popup opened={opened} anchorRef={cardRef} onClose={close}>
                <UnitDetails
                    versionConfig={config}
                    descriptor={descriptor}
                    unit={unit}
                    canSubmitAction={canSubmitAction}
                    setSelectedUser={setSelectedUser}
                    closePopup={() => setOpened(false)}
                    gameState={gameState}></UnitDetails>
            </Popup>
        </div>
    );
}
