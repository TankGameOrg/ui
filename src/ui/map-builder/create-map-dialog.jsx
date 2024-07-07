import "./create-map-dialog.css";
import { useState } from "preact/hooks";
import { getAllVersions, getGameVersion } from "../../versions";
import { createEmptyFileData } from "../../drivers/game-file-data";
import { WebGameFile } from "../../drivers/game-file-web";
import { deepClone } from "../../utils";
import Entity from "../../game/state/board/entity";

function createDefaultMetaEntities(builderConfig) {
    let metaEntities = {};

    for(const entityName of Object.keys(builderConfig.metaEntities)) {
        const metaEntityConfig = builderConfig.metaEntities[entityName];

        metaEntities[entityName] = new Entity({
            type: metaEntityConfig.type,
            attributes: deepClone(metaEntityConfig.defaultAttributes)
        });
    }

    return metaEntities;
}


export function CreateGameDialog({ open, setOpen, setGameFile, isUnsaved, setIsUnsaved }) {
    const allGameVersions = getAllVersions();
    const defaultVersion = allGameVersions[allGameVersions.length - 1];
    const [gameVersion, setGameVersion] = useState(defaultVersion);
    const [width, setWidth] = useState();
    const [height, setHeight] = useState();

    if(!open) return;

    const builderConfig = getGameVersion(gameVersion)?.getBuilderConfig?.();

    const createIsDisabled =
        isNaN(+width) || isNaN(+height) ||
        +height <= 0 || +width <= 0 ||
        builderConfig.board.maxWidth < +width || builderConfig.board.maxHeight < +height;

    const createGame = (e) => {
        e.preventDefault();
        if(createIsDisabled) return;

        setIsUnsaved(true);
        setOpen(false);

        setGameFile(WebGameFile.create(createEmptyFileData({
            gameVersion: gameVersion,
            width: +width,
            height: +height,
            metaEntities: createDefaultMetaEntities(builderConfig),
        })));

        // Reset form
        setGameVersion(defaultVersion);
        setWidth(undefined);
        setHeight(undefined);
    };

    return (
        <>
            <div className="map-builder-dialog-backdrop"></div>
            <div className="map-builder-create-dialog centered" onClick={() => setOpen(false)}>
                <div className="map-builder-create-dialog-content" onClick={e => e.stopPropagation()}>
                    <form onSubmit={createGame}>
                        <h2>Create Map</h2>
                        <div className="map-builder-dialog-body">
                            <p>
                                <label>
                                    <span className="map-builder-dialog-label-name">Game Version</span>
                                    <select value={gameVersion} onChange={e => setGameVersion(e.target.value)}>
                                        {allGameVersions.map(versionName => {
                                            return (
                                                <option key={versionName}>{versionName}</option>
                                            );
                                        })}
                                    </select>
                                </label>
                            </p>
                            <p>
                                <label>
                                    <span className="map-builder-dialog-label-name">Width</span>
                                    <input type="text" value={width} onKeyUp={e => setWidth(e.target.value)}/>
                                </label>
                                <label>
                                    <span className="map-builder-dialog-label-name">Height</span>
                                    <input type="text" value={height} onKeyUp={e => setHeight(e.target.value)}/>
                                </label>
                            </p>
                        </div>
                        {isUnsaved ?
                            <p className="create-overwrite-warning">Warning your current map has unsaved changes that will be deleted when you click create</p> : undefined}
                        <div style={{"text-align": "right"}}>
                            <button type="submit" disabled={createIsDisabled}>Create</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}