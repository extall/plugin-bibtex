import joplin from "api";
import { Reference } from "../../model/reference.model";
import { getDate, getDateYear } from "../../util/get-date.util";
import { encode } from "html-entities";
import { CITATION_POPUP_ID } from "../../constants";
const fs = joplin.require("fs-extra");

let popupHandle: string = "";

/**
 * Show a dialog for the user to choose from a list of references
 * to be inserted in the note content
 * @returns ID of the selected reference
 */
export async function showCitationPopup (refs: Reference[]): Promise<string[]> {

    // If the dialog was not initialized, create it and get its handle
    if (popupHandle === "") {
        popupHandle = await joplin.views.dialogs.create(CITATION_POPUP_ID);
    }

    await loadAssets(refs);
    const result = await joplin.views.dialogs.open(popupHandle);
    
    if (result.id === "cancel") return [];

    let selectedRefsIDs: string[] = JSON.parse(result.formData["main"]["output"]);

    /* Return an array of selected references' IDS */
    return selectedRefsIDs;
}

async function loadAssets (refs: Reference[]): Promise<void> {
    const installationDir = await joplin.plugins.installationDir();
    let html: string = await fs.readFile(
        installationDir + "/ui/citation-popup/view.html",
        'utf8'
    );
    html = html.replace("<!-- content -->", fromRefsToHTML(refs));

    await joplin.views.dialogs.setHtml(popupHandle, html);
    await joplin.views.dialogs.addScript(popupHandle, "./ui/citation-popup/lib/autoComplete.min.css");
    await joplin.views.dialogs.addScript(popupHandle, "./ui/citation-popup/lib/autoComplete.min.js");
    await joplin.views.dialogs.addScript(popupHandle, "./ui/citation-popup/lib/he.min.js");
    await joplin.views.dialogs.addScript(popupHandle, "./ui/citation-popup/view.css");
    await joplin.views.dialogs.addScript(popupHandle, "./ui/citation-popup/view.js");
}

function fromRefsToHTML (refs: Reference[]): string {
    const JSONString = JSON.stringify(
        refs.map(ref => {
            return {
                id: ref.id,
                title: ref.title,
                author: ref.author,
                year: getDateYear(ref)
            };
        })
    );
    const ans: string = `
        <div id="json" style="display:none;">
            ${ encode(JSONString) }
        </div>
    `;
    return ans;
}
