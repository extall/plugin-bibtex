import {Reference} from "../../model/reference.model";


export default function (context) {
    return {
        plugin: function (markdownIt, _options) {
            const contentScriptId = context.contentScriptId;
            var gstate;

            // Let's try defining the [references] tag
            // Used markdownit-table-of-contents plugin as reference here
            function references_list(state, silent) {

                // Marker pattern
                var markerPattern: RegExp = /^\[references\]/im;
                var match;
                var token;

                if (state.src.charCodeAt(state.pos) !== 0x5B) {
                    return false;
                }

                if (silent){
                    return false;
                }

                match = markerPattern.exec(state.src.substr(state.pos));
                match = !match ? [] : match.filter(function (m) {
                    return m;
                });
                if (match.length < 1) {
                    return false;
                }

                token = state.push('references_open', 'references', 1);
                token.markup = '[references]';
                token = state.push('references_body', '', 0);
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
                var IDs;
                for (let kk=0; kk<gstate.tokens.length; kk++){
                    if (gstate.tokens[kk].type == "reference_list"){
                        IDs = gstate.tokens[kk]["attrs"][0][1];
                    }
                }

                // Do the message parsing stuff now...........
                if (IDs.length === 0) return "";

                const script: string = `
					webviewApi.postMessage("${contentScriptId}", ${JSON.stringify(
                    IDs
                )}).then(html => {
						const referenceListView = document.getElementById("references_list");
						const referenceTitleView = document.getElementById("references_title");

						if (html !== "") referenceTitleView.style.display = "block";

						referenceListView.innerHTML = html;
					});
					return true;
				`;

                return `
					<h1 id="references_title" style="display:none">References</h1>
					<div id="references_list">Loading ...</div>
					<style onload='${script.replace(/\n/g, " ")}'></style>
				`;

            }

            markdownIt.renderer.rules.references_close = function (tokens, index) {
                return "</div>";
            }

            markdownIt.core.ruler.push('grab_state', function(state) {
                gstate = state;
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
