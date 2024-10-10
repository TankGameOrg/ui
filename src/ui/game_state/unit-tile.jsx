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

function useAnimation(animationInfo, animationRef, dispatchAnimation, position, name, animationStartClosure) {
    const animationId = animationInfo?.id;
    const animationSpecificInfo = animationInfo?.[name];

    useEffect(() => {
        const element = animationRef.current;

        if(animationSpecificInfo !== undefined && element !== undefined) {
            let animation = animationStartClosure(element, animationSpecificInfo);

            if(animationSpecificInfo?.startTime === undefined) {
                // On the first iteration save the start time so if the react
                // state updates we can resume the animation
                dispatchAnimation(startAnimation(position, name, animationId, Date.now()));
            }
            else {
                // The animation has already started by the react state has been modified
                // resume the animation from where it left off
                animation.currentTime = Date.now() - animationSpecificInfo.startTime;
            }

            animation.finished.then(() => {
                dispatchAnimation(finishAnimation(position, name, animationId));
            }).catch(() => {
                // Animation.cancel() causes animation.finished the throw a rejection
                // to avoid annoying errors during development we eat the error
                // https://developer.mozilla.org/en-US/docs/Web/API/Animation/cancel
            });

            return () => animation.cancel();
        }
    }, [animationSpecificInfo, animationId, animationRef, dispatchAnimation, position, name, animationStartClosure]);
}

function AnimatedPopups({ animationInfo, dispatchAnimation, position }) {
    const popupRef = useRef();
    useAnimation(animationInfo, popupRef, dispatchAnimation, position, "popups", (popupElement) => {
        return popupElement.animate([
            { offset: 0,   opacity: 0, transform: "translateY(10px)" },
            { offset: 0.1, opacity: 1, transform: "translateY(  0px)" },
            { offset: 0.9, opacity: 1, transform: "translateY(  0px)" },
            { offset: 1,   opacity: 0, transform: "translateY(10px)" },
        ], {
            duration: 1400,
        });
    });

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

    useAnimation(animationInfo, wrapperRef, dispatchAnimation, unit.position, "move", (cardElement, animationInfo) => {
        const moveStyles = getMoveStyles({ move: animationInfo });

        return cardElement.animate([
            { transform: moveStyles.transform },
            { transform: "translate(0, 0)" },
        ], {
            duration: 500,
        });
    });

    useAnimation(animationInfo, wrapperRef, dispatchAnimation, unit.position, "spawn", (cardElement) => {
        return cardElement.animate([
            { opacity: 0 },
            { opacity: 1 },
        ], {
            duration: 200,
        });
    });

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

    let animationStyles;
    if(animationInfo.spawn !== undefined) {
        animationStyles = {
            opacity: 0,
        };
    }
    else if(animationInfo.move !== undefined) {
        animationStyles = getMoveStyles(animationInfo);
    }

    return (
        <div className="board-space-unit-wrapper" ref={wrapperRef} style={animationStyles}>
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
