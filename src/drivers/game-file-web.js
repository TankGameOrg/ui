/* globals window */
import { dumpToRaw, loadFromRaw } from "./game-file-data.js";

const FILE_PICKER_TYPES = [
    {
        description: "Map",
        accept: {
            "application/json": [".json"],
        },
    },
];

export async function openFile() {
    if(window.showOpenFilePicker === undefined) {
        throw new Error("Your browser does not support opening local files.  Please use a modern chromium based browser (i.e. Chrome or Edge).");
    }

    const [fileHandle] = await window.showOpenFilePicker({
        types: FILE_PICKER_TYPES,
    });

    const contents = await (await fileHandle.getFile()).text();

    return new WebGameFile(
        fileHandle,
        loadFromRaw(JSON.parse(contents)),
    );
}

class WebGameFile {
    constructor(fileHandle, fileData) {
        this._fileHandle = fileHandle;
        this._fileData = fileData;
    }

    getData() {
        return this._fileData;
    }

    setData(fileData) {
        this._fileData = Promise.resolve(fileData);
    }

    async save() {
        const contents = JSON.stringify(dumpToRaw(this._fileData), null, 4);
        const writableStream = await this._fileHandle.createWritable();

        try {
            await writableStream.write(contents);
        }
        finally {
            await writableStream.close();
        }
    }
}
