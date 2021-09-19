import {Reference} from "../../model/reference.model";
import joplin from "api";
import {parse} from "../../util/parser.util";

const {StringDecoder} = require('string_decoder');

export default function (context) {
    return {
        plugin: function (markdownIt, _options) {
            const contentScriptId = context.contentScriptId;
            var gstate;
            var default_options = {
                "csl": "ieee",
                "name": "References",
                "tag": "h1" // TODO: Should allow user to select this as well
            }

            // Let's try defining the [references style="chosen.csl" name="References section name"] tag
            // Used markdownit-table-of-contents plugin as reference here
            function references_list(state, silent) {

                // Marker pattern

                // TODO: This is pretty bad since we include the attachment link here, should instead do token lookaround to get the file link etc.
                var markerPattern: RegExp = /^\[references(?:\s+?)?(style=\"([a-z0-9\-]+)?\")?(?:\s+?)?(name=\"(.+?)?\")?\](?:\s+)?\[(.+?)\.bib\]\(\:\/([a-z0-9]+)\)/im;
                var match;
                var token;

                let ref_name: string, ref_style: string, ref_file: string;

                if (state.src.charCodeAt(state.pos) !== 0x5B) {
                    return false;
                }

                if (silent) {
                    return false;
                }

                match = markerPattern.exec(state.src.substr(state.pos));
                let orig_match = {
                    ...match
                };

                // Remove undefined entries
                match = !match ? [] : match.filter(function (m) {
                    return m;
                });
                if (match.length < 1) {
                    return false;
                }

                // OK, let's set the options
                // TODO: need to rewrite the above to make it sensible
                ref_style = orig_match[2];
                ref_name = orig_match[4];
                ref_file = orig_match[6];

                token = state.push('references_open', 'references', 1);
                token.markup = '[references]';
                token = state.push('references_body', '', 0);

                // Store also the attributes that we will need later
                token.attrSet('style', ref_style);
                token.attrSet('name', ref_name);
                token.attrSet('file', ref_file);

                token = state.push('references_close', 'references', -1);

                var newline = state.src.indexOf('\n', state.pos);
                if (newline !== -1) {
                    state.pos = newline;
                } else {
                    state.pos = state.pos + state.posMax + 1;
                }

                return true;

            }

            markdownIt.inline.ruler.after('emphasis', 'references_list', references_list);

            markdownIt.renderer.rules.references_open = function (tokens, index) {
                return "<div id='the_bibtex_references'>";
            }

            markdownIt.renderer.rules.references_body = function (tokens, index) {

                // Can I locate the references_list token?
                // TODO: Need to figure out a better way to do this. In the current situation,
                // TODO: a token is added to the data which contains the references, and we must
                // TODO: specify a render rule that will instead of showing the token, render an empty ""
                // TODO: Internally we use that token though... bad design
                var IDs;
                for (let kk = 0; kk < gstate.tokens.length; kk++) {
                    if (gstate.tokens[kk].type == "reference_list") {
                        IDs = gstate.tokens[kk]["attrs"][0][1];
                    }
                }

                // Nothing to do, then return
                if (IDs.length === 0) return "";

                // Get the necessary attributes from the token
                let style: string, name: string, tag: string, file: string;
                style = tokens[index].attrGet('style') !== undefined ?
                    tokens[index].attrGet('style') :
                    default_options['style'];

                name = tokens[index].attrGet('name') !== undefined ?
                    tokens[index].attrGet('name') :
                    default_options['name'];

                file = tokens[index].attrGet('file') !== undefined ?
                    tokens[index].attrGet('file') :
                    "";

                tag = default_options['tag'];

                if (file === "") {
                    return "";
                }

                // Now we must read and parse the BibTeX file AGAIN
                // for rendering purposes using the desired CSL (default is IEEE)

                // Let's try to get the file contents
                let attached_bibfile_obj: any;
                let attached_bibfile_content: string = "";

                // TODO: [CRITICAL] There is no way to call the joplin data api from a content script directly
                // TODO: It probably means we cannot proceed with the implementation
                //attached_bibfile_obj = joplin.data.get(['resources', file, 'file']);
                //let bibBytes: any = attached_bibfile_obj.body;
                //let StringDec = new StringDecoder();
                //attached_bibfile_content = StringDec.write(bibBytes);
                console.log("Well, at least here's what the context looks like");
                console.log(context);

                // Try to send a message: TODO: nope, does not work.
                // console.log("I'll try to send a message through context...");
                // context.postMessage(contentScriptId, "The message");

                //console.log("I was able to read the bibfile and here are the contents");
                //console.log(attached_bibfile_content);

                const script: string = "";

                // TODO: Can I at least friggin read the bundled CSL file?
                // TODO: try it

                // const script: string = `
				// 	webviewApi.postMessage("${contentScriptId}", ${JSON.stringify(
                //     IDs
                // )}).then(html => {
				// 		const referenceListView = document.getElementById("references_list");
				// 		const referenceTitleView = document.getElementById("references_title");
                //
				// 		if (html !== "") referenceTitleView.style.display = "block";
                //
				// 		referenceListView.innerHTML = html;
				// 	});
				// 	return true;
				// `;

                return `
					<${tag} id="references_title">${name}</${tag}>
					<div id="references_list">Loading ...</div>
					<style onload='${script.replace(/\n/g, " ")}'></style>
				`;

            }

            markdownIt.renderer.rules.references_close = function (tokens, index) {
                return "</div>";
            }

            markdownIt.core.ruler.push('grab_state', function (state) {
                gstate = state;
                // Let's list the tokens
                console.log(state.tokens);
            });

            /* Appends a new custom token for references list */
            markdownIt.core.ruler.push("reference_list", async (state) => {
                /* Collect references from the note body using Depth-first-search */
                const ids: Reference[] = [];
                dfs(state.tokens);

                function dfs(children: any[]): void {
                    if (!children) return;

                    /* Search for three consecutive tokens: "link_open", "text", and "link_close" */
                    for (let i = 1; i < children.length - 1; i++) {
                        const curr = children[i],
                            prev = children[i - 1],
                            next = children[i + 1];
                        if (
                            prev["type"] === "link_open" &&
                            curr["type"] === "text" &&
                            next["type"] === "link_close" &&
                            curr.content &&
                            curr.content.length > 1 &&
                            curr.content.startsWith("@")
                        ) {
                            const id = curr.content.substring(1);
                            ids.push(id);
                        } else {
                            if (curr["children"]) dfs(curr["children"]);
                        }
                    }
                    // first and last child that were not traversed previously
                    const last = children[children.length - 1],
                        first = children[0];
                    if (last["children"]) dfs(last["children"]);
                    if (first["children"]) dfs(first["children"]);
                }

                /* Append reference_list token */
                let token = new state.Token("reference_list", "", 0);
                token.attrSet("refs", ids);
                state.tokens.push(token);
            });

            // Need to assign an empty renderer to the reference_list token
            markdownIt.renderer.rules["reference_list"] = function (tokens, idx, options) {
                return "";
            }

            /* Define how to render the previously defined token */
            // markdownIt.renderer.rules["reference_list"] = renderReferenceList;
            //
            // function renderReferenceList(tokens, idx, options) {
            //     // IDs are an array of such type ["Steward2019useagriculturalrobots"]
            //     let IDs: string[] = tokens[idx]["attrs"][0][1];
            //     if (IDs.length === 0) return "";
            //
            //     const script: string = `
            // 		webviewApi.postMessage("${contentScriptId}", ${JSON.stringify(
            //         IDs
            //     )}).then(html => {
            // 			const referenceListView = document.getElementById("references_list");
            // 			const referenceTitleView = document.getElementById("references_title");
            //
            // 			if (html !== "") referenceTitleView.style.display = "block";
            //
            // 			referenceListView.innerHTML = html;
            // 		});
            // 		return false;
            // 	`;
            //
            //     return `
            // 		<h1 id="references_title" style="display:none">References</h1>
            // 		<div id="references_list">Loading ...</div>
            // 		<style onload='${script.replace(/\n/g, " ")}'></style>
            // 	`;
            // }
        },
    };
}
