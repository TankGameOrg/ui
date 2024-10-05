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
    const animations = animationData[position?.humanReadable];
    if(animations === undefined) return;

    let animationInfo = {
        ...animations,
    };

    if(animations.move !== undefined) {
        let startX = (animations.move.from.x - animations.move.to.x) * TILE_WIDTH;
        let startY = (animations.move.from.y - animations.move.to.y) * TILE_HEIGHT;

        animationInfo.move = {
            transform: `translate(${Math.round(startX)}px, ${Math.round(startY)}px)`,
            started: animations.move.started,
        };
    }

    return animationInfo;
}

const animationStartFunctor = {
    move: (cardElement, animationInfo) => {
        return cardElement.animate([
            { transform: animationInfo.transform },
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

function tiggerAnimation(animationInfo, dispatchAnimation, position, name, element) {
    if(animationInfo[name] !== undefined && !animationInfo[name].started) {
        const animation = animationStartFunctor[name](element, animationInfo[name]);

        animation.finished.then(() => {
            dispatchAnimation(finishAnimation(position, name, animationInfo.id));
        });

        dispatchAnimation(startAnimation(position, name, animationInfo.id));
    }
}

function triggerCardAnimations(animationInfo, cardElement, dispatchAnimation, position) {
    for(const name of ["move"]) {
        tiggerAnimation(animationInfo, dispatchAnimation, position, name, cardElement);
    }
}


function AnimatedPopups({ animationInfo, dispatchAnimation, position }) {
    const popupRef = useRef();

    useEffect(() => {
        if(animationInfo && popupRef.current) {
            tiggerAnimation(animationInfo, dispatchAnimation, position, "popups", popupRef.current);
        }
    }, [animationInfo, popupRef, dispatchAnimation, position]);

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
    useEffect(
        () => animationInfo && triggerCardAnimations(animationInfo, wrapperRef.current, dispatchAnimation, unit.position),
        [animationInfo, wrapperRef, dispatchAnimation, unit.position]);

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
        <div className="board-space-unit-wrapper" ref={wrapperRef} style={{ transform: animationInfo?.move?.transform }}>
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
