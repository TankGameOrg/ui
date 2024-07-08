/* globals window, document, FileReader, URL, Blob */
import { dumpToRaw, loadFromRaw } from "./game-file-data.js";

const ACCEPT = ".json";

const FILE_PICKER_TYPES = [
    {
        description: "Map",
        accept: {
            "application/json": [".json"],
        },
    },
];

const SUPPORTS_FS_API = window.showOpenFilePicker !== undefined && window.showSaveFilePicker !== undefined;

export const SAVE_ON_CTRL_S = SUPPORTS_FS_API;
export const SAVE_BUTTON_TEXT = SUPPORTS_FS_API ? "Save Map" : "Download Map";


/**
 * Prompt the user to open a file using a native file picker
 * @returns WebGameFile with the contents and a handle
 */
export async function openFile() {
    if(SUPPORTS_FS_API) {
        return await openFileFsApi();
    }
    else {
        return await openFileElement();
    }
}

/**
 * Open a file using the file system API
 * @returns WebGameFile
 */
async function openFileFsApi() {
    const [fileHandle] = await window.showOpenFilePicker({
        types: FILE_PICKER_TYPES,
    });

    const contents = await (await fileHandle.getFile()).text();

    return new WebGameFile(
        fileHandle,
        loadFromRaw(JSON.parse(contents)),
    );
}

/**
 * Save the file using the file system API
 * @param {*} fileHandle The fs handle for the file
 * @param {*} contents The string we want to write to the file
 * @returns An updated file handle to use in future calls
 */
async function saveFileFsApi(fileHandle, contents) {
    if(!fileHandle) {
        fileHandle = await window.showSaveFilePicker({
            types: FILE_PICKER_TYPES,
        });
    }

    const writableStream = await fileHandle.createWritable();

    try {
        await writableStream.write(contents);
    }
    finally {
        await writableStream.close();
    }

    return fileHandle;
}

/**
 * Open a file using the HTML file element
 * @returns WebGameFile
 */
function openFileElement() {
    return new Promise((resolve, reject) => {
        let fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ACCEPT;

        fileInput.addEventListener("change", e => {
            if(e.target.files.length !== 1) {
                reject(new Error(`Expected exactly 1 file but got ${e.target.files.length}`));
                return;
            }

            const file = e.target.files[0];
            let reader = new FileReader();
            reader.readAsText(file, "UTF-8");

            reader.addEventListener("load", e => {
                resolve(new WebGameFile(
                    file.name,
                    loadFromRaw(JSON.parse(e.target.result)),
                ));
            });

            reader.addEventListener("error", () => {
                reject(new Error(`Failed to load ${file.name}`));
            });
        });

        // The file input does not need to be added to the DOM (from what I can tell)
        // but the click function needs to be called from within a user triggered event
        fileInput.click();
    });
}

/**
 * Download the file using an anchor element
 * @param {*} fileHandle A string containing the file name
 * @param {*} contents  The string we want to write to the file
 */
function downloadFile(fileHandle, contents) {
    let name = fileHandle;
    if(fileHandle === undefined) name = "map.json";

    const blob = new Blob([contents], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    let link = document.createElement("a");
    link.download = name;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
}

/**
 * A wrapper for the data contained in a file
 */
export class WebGameFile {
    /**
     * Create an WebGameFile that isn't tied to a local file
     * @param {*} fileData The data to store in the file
     * @returns WebGameFile
     */
    static create(fileData) {
        return new WebGameFile(undefined, fileData);
    }

    /**
     * @private
     * @param {*} fileHandle Implementation specific data tied to the file
     * @param {*} fileData The data contained in the file
     */
    constructor(fileHandle, fileData) {
        this._fileHandle = fileHandle;
        this._fileData = fileData;
    }

    getData() {
        return this._fileData;
    }

    setData(fileData) {
        this._fileData = fileData;
    }

    /**
     * Save or Download the file
     */
    async save() {
        const contents = JSON.stringify(dumpToRaw(this._fileData), null, 4);

        if(SUPPORTS_FS_API) {
            this._fileHandle = await saveFileFsApi(this._fileHandle, contents);
        }
        else {
            downloadFile(this._fileHandle, contents);
        }
    }
}
