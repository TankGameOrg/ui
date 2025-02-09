import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import "./unit-tile.css";
import { prettyifyName } from "../../utils.js";
import { finishAnimation, startAnimation } from "../../interface-adapters/animation-manager.js";


function makeBadgeStyle(badge) {
    return {
        color: badge.textColor,
        background: badge.background,
    };
}

function getBadgesForUnit(cell) {
    const rightBadge = cell.badge !== undefined ? (
        <div className="board-space-unit-badge right-badge" style={makeBadgeStyle(cell.badge)}>
            {cell.badge.text}
        </div>
    ): undefined;

    const indicators = cell.indicators
        .map(indicator => <span key={indicator.symbol} style={{ color: indicator.color }}>{indicator.symbol}</span>);

    const leftBadge = indicators.length > 0 ? (
        <div className="board-space-unit-badge left-badge" style={{ background: cell.indicatorBackground }}>
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

export function UnitTile({ cell, config, gameState, animationState, dispatchAnimation }) {
    const wrapperRef = useRef();

    // const animationInfo = useMemo(() => getAnimationInfo(animationState, position), [animationState, position]);

    // When we destory an element it is immediately removed from the state but we need something to fade out
    // so we add it back in here until the animation completes
    // if(animationInfo.destroy !== undefined) {
    //     unit = animationInfo.destroy.element;
    // }

    // useAnimation(animationInfo, wrapperRef, dispatchAnimation, position, "move", (cardElement, animationInfo) => {
    //     const moveStyles = getMoveStyles({ move: animationInfo });

    //     return cardElement.animate([
    //         { transform: moveStyles.transform },
    //         { transform: "translate(0, 0)" },
    //     ], {
    //         duration: 500,
    //     });
    // });

    // useAnimation(animationInfo, wrapperRef, dispatchAnimation, position, "spawn", (cardElement) => {
    //     return cardElement.animate([
    //         { opacity: 0, transform: "scale(80%)", },
    //         { opacity: 0.5, transform: "scale(100%)", },
    //         { opacity: 1, transform: "scale(100%)", },
    //     ], {
    //         duration: 300,
    //     });
    // });

    // useAnimation(animationInfo, wrapperRef, dispatchAnimation, position, "destroy", (cardElement) => {
    //     return cardElement.animate([
    //         { opacity: 1, transform: "scale(100%)", },
    //         { opacity: 0.5, transform: "scale(100%)", },
    //         { opacity: 0, transform: "scale(80%)", },
    //     ], {
    //         duration: 300,
    //     });
    // });

    const tileStyles = {
        background: cell.icon || "",
        color: cell.textColor || "#000",
    };

    const badges = getBadgesForUnit(cell);

    const label = cell.label !== undefined ? (
        <div className="board-space-unit-title board-space-centered">
            <div className="board-space-unit-title-inner">{prettyifyName(cell.label)}</div>
        </div>
    ) : (
        <div className="board-space-unit-title-placeholder"></div>
    );

    let animationStyles;
    // if(animationInfo.spawn !== undefined) {
    //     animationStyles = {
    //         opacity: 0,
    //         transform: "scale(80%)",
    //     };
    // }
    // else if(animationInfo.move !== undefined) {
    //     animationStyles = getMoveStyles(animationInfo);
    // }

    if(!cell.showUnitTile) {
        return;
    }

    return (
        <div className="board-space-unit-wrapper" ref={wrapperRef} style={animationStyles}>
            <div className="board-space-unit" style={tileStyles}>
                {label}
                <div className="board-space-centered board-space-attribute-featured">
                    {cell.text}
                </div>
                {badges}
                {/* <AnimatedPopups
                    animationInfo={animationInfo}
                    dispatchAnimation={dispatchAnimation}
                    position={position}></AnimatedPopups> */}
            </div>
        </div>
    );
}
