import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import "./unit-tile.css";
import { Popup } from "../generic/popup.jsx";
import { prettyifyName } from "../../utils.js";
import { AttributeList } from "./attribute-list.jsx";
import { finishAnimation, startAnimation } from "../../interface-adapters/animation-manager.js";


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

const TILE_WIDTH = 68;
const TILE_HEIGHT = 68;

function getAnimationInfo(animationState, position) {
    const {animationData} = animationState;
    const animationInfo = animationData[position?.humanReadable];
    if(animationInfo === undefined) return [];

    return animationInfo;
}

function getMoveStyles(animationInfo) {
    if(animationInfo.move !== undefined) {
        let startX = (animationInfo.move.from.x - animationInfo.move.to.x) * TILE_WIDTH;
        let startY = (animationInfo.move.from.y - animationInfo.move.to.y) * TILE_HEIGHT;

        return {
            transform: `translate(${Math.round(startX)}px, ${Math.round(startY)}px)`,
            "z-index": 10,
        };
    }
}

const animationStartFunctor = {
    move: (cardElement, animationInfo) => {
        const moveStyles = getMoveStyles({ move: animationInfo });

        return cardElement.animate([
            { transform: moveStyles.transform },
            { transform: "translate(0, 0)" },
        ], {
            duration: 500,
            rangeStart: "50%",
        });
    },
    popups: (popupElement) => {
        return popupElement.animate([
            { offset: 0,   opacity: 0, transform: "translateY(10px)" },
            { offset: 0.1, opacity: 1, transform: "translateY(  0px)" },
            { offset: 0.9, opacity: 1, transform: "translateY(  0px)" },
            { offset: 1,   opacity: 0, transform: "translateY(10px)" },
        ], {
            duration: 1400,
        });
    },
};

function triggerAnimation(animationInfo, animationId, dispatchAnimation, position, name, element) {
    if(animationInfo !== undefined && element !== undefined) {
        let animation = animationStartFunctor[name](element, animationInfo);

        if(animationInfo?.startTime === undefined) {
            dispatchAnimation(startAnimation(position, name, animationId, Date.now()));
        }
        else {
            animation.currentTime = Date.now() - animationInfo.startTime;
        }

        animation.play();

        animation.finished.then(() => {
            dispatchAnimation(finishAnimation(position, name, animationId));
        }, () => {

        });

        return () => {
            animation.cancel();
        }
    }
}

function AnimatedPopups({ animationInfo, dispatchAnimation, position }) {
    const popupRef = useRef();

    const animationId = animationInfo?.id;
    useEffect(() => {
        if(animationInfo?.popups && popupRef.current) {
            return triggerAnimation(animationInfo.popups, animationId, dispatchAnimation, position, "popups", popupRef.current);
        }
    }, [animationInfo?.popups, animationId, popupRef, dispatchAnimation, position]);

    if(animationInfo?.popups === undefined) return;

    const popups = animationInfo.popups.list.map(popup => {
        return (
            <div key={popup.attribute} className="unit-tile-animated-stat-popup" style={popup.style}>
                {popup.difference} {prettyifyName(popup.attribute)}
            </div>
        );
    });

    return (
        <div className="unit-tile-animated-stat-popups" ref={popupRef}>
            {popups}
        </div>
    );
}

export function UnitTile({ unit, showPopupOnClick, config, setSelectedUser, canSubmitAction, gameState, animationState, dispatchAnimation }) {
    const cardRef = useRef();
    const wrapperRef = useRef();
    const [opened, setOpened] = useState(false);

    const close = useCallback(() => setOpened(false), [setOpened]);

    const animationInfo = useMemo(() => getAnimationInfo(animationState, unit.position), [animationState, unit.position]);

    const animationId = animationInfo?.id;
    useEffect(() => {
        return triggerAnimation(animationInfo?.move, animationId, dispatchAnimation, unit.position, "move", wrapperRef.current);
    }, [animationInfo?.move, animationId, wrapperRef, dispatchAnimation, unit.position]);

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
        <div className="board-space-unit-wrapper" ref={wrapperRef} style={getMoveStyles(animationInfo)}>
            <div className="board-space-unit" ref={cardRef} onClick={() => showPopupOnClick && setOpened(open => !open)} style={tileStyles}>
                {label}
                <div className="board-space-centered board-space-attribute-featured">
                    {descriptor.getFeaturedAttribute()}
                </div>
                {badges}
                <AnimatedPopups
                    animationInfo={animationInfo}
                    dispatchAnimation={dispatchAnimation}
                    position={unit.position}></AnimatedPopups>
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
