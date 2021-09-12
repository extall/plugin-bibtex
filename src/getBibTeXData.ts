import joplin from "api";
import { DataStore } from "./data/data-store";
import { parse } from "./util/parser.util";
import { Reference } from "./model/reference.model";
import {
    ERROR_PARSING_FAILED,
    SETTINGS_BIBTEX_FILE_PATH_ID,
} from "./constants";
const fs = joplin.require("fs-extra");

/**
 * Get .bib file paths from settings
 * Read the contents of the file
 * Parse
 * Store
 */
export async function getBibTeXData(): Promise<Reference[]> {
    // Get file Paths
    // const filePaths: string[] = (
    //     await joplin.settings.value(SETTINGS_BIBTEX_FILE_PATH_ID)
    // )
    //     .split(";") // use ; as delimiter
    //     .map((path) => path.trim()); // remove spaces at the end of each path

    // Read the contents of each file and
    // let fileContent: string;
    // try {
    //     fileContent = (
    //         await Promise.all(
    //             filePaths.map((path) => fs.readFile(path, "utf8"))
    //         )
    //     ).join("");
    // } catch (e) {
    //     console.log(e);
    //     throw new Error(`Error: Could not open some files: ${e.message}`);
    // }

    // @2021-09-12 instead of reading the file, we parse the current note, find a .bib file, and parse that
    let currentNote: any = await joplin.workspace.selectedNote();
    let refs: Reference[] = [];

    if (currentNote){
        // Parse the note body detecting the first available .bib file
        let noteBody: string = currentNote.body;

        let attached_bibfile: string = "";
        const lines = noteBody.split('\n');
        for (const line of lines) {
            let myregexp = /\[.+?\.bib\]\(\:\/([0-9a-z]+)\)/;
            let match = myregexp.exec(line);
            if (match != null) {
                attached_bibfile = match[1];
                console.log(attached_bibfile);
                break;
            }
        }

        let attached_bibfile_obj: any;
        let attached_bibfile_content: string = "";
        if (attached_bibfile !== ""){
            attached_bibfile_obj = await joplin.data.get(['resources', attached_bibfile, 'file']);
            attached_bibfile_content = attached_bibfile_obj.body;
        }

        // Parse the raw data and store it
        try {
            refs = parse(attached_bibfile_content);
            DataStore.setReferences(refs);
        } catch (e) {
            console.log(e);
            throw new Error(`${ERROR_PARSING_FAILED}\n\n${e.message}`);
        }

        return refs;
    }
    else{
        console.info('No note is selected, no .bib files to locate');
        return refs;
    }






}
