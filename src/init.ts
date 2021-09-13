import joplin from "api";
import { initConfigScreen } from "./ui/settings";
import { registerToolbarButton } from "./ui/toolbar-button";
import {registerAddAttachedBibTexReferenceCommand} from "./add-attached-bibtex-reference.command";
import { registerBibliographyRenderer } from "./ui/bibliography-renderer";
import { getBibTeXData } from "./getBibTeXData";

/**
 * Initialize the main components of the plugin
 */
export async function init(): Promise<void> {
    await initConfigScreen();
    await registerAddAttachedBibTexReferenceCommand();
    await registerToolbarButton();

    try {
        await getBibTeXData();
    } catch (e) {
        await joplin.views.dialogs.showMessageBox(e.message);
    }

    await registerBibliographyRenderer();

    // Register the necessary triggers
    await joplin.workspace.onNoteChange(() => {
        try {
            getBibTeXData();
        } catch (e) {
            joplin.views.dialogs.showMessageBox(e.message);
        }
    })
}
