"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiEdit = void 0;
const vscode = require("vscode");
const openai_1 = require("openai");
/**
 * Gets the highlighted code for this comment thread
 * @param thread
 * @returns
 */
async function getCommentThreadCode(thread) {
    const document = await vscode.workspace.openTextDocument(thread.uri);
    // Get selected code for the lines in which the comment thread has any selection
    const lineRange = new vscode.Range(new vscode.Position(thread.range.start.line, 0), thread.range.end);
    return document.getText(lineRange);
}
/**
 * AI will edit the highlighted code based on the given instructions.
 * Uses the OpenAI Edits endpoint. Replaces the highlighted code
 * with AI generated code. You can undo to go back.

 * @param reply
 * @returns
 */
async function aiEdit(reply) {
    const question = reply.text.trim();
    const thread = reply.thread;
    const model = vscode.workspace.getConfiguration('devxai').get('models') + "";
    const messages = [];
    let codeBlock = await getCommentThreadCode(thread);
    // Empty lines in the beginning of codeBlock stored in a variable
    const emptyLinesBefore = codeBlock.match(/^\s*[\r\n]/) || [];
    // Empty lines after
    const emptyLinesAfter = codeBlock.match(/[\r\n]\s*$/) || [];
    //remove empty lines from the beginning and end of codeBlock
    codeBlock = codeBlock.replace(/^\s*[\r\n]/gm, '').replace(/[\r\n]\s*$/gm, '');
    const commonIndent = findCommonIndent(codeBlock);
    codeBlock = codeBlock.replace(new RegExp('^' + commonIndent, 'gm'), '');
    messages.push({ "role": "system", "content": "Return fully edited code as per user request delimitted by tripple quotes and nothing else." });
    messages.push({ "role": "user", "content": "```\n" + codeBlock + "\n```" });
    const filteredComments = thread.comments.filter(comment => comment.label !== "NOTE");
    for (let i = Math.max(0, filteredComments.length - 8); i < filteredComments.length; i++) {
        if (filteredComments[i].author.name === "VS Code") {
            messages.push({ "role": "user", "content": `${filteredComments[i].body.value}` });
        }
        else if (filteredComments[i].author.name === "DEVX AI") {
            messages.push({ "role": "assistant", "content": `${filteredComments[i].body.value}` });
        }
    }
    messages.push({ "role": "user", "content": `${question}` });
    const apiKey = vscode.workspace.getConfiguration('devxai').get('ApiKey');
    const openai = new openai_1.default({
        apiKey: apiKey,
    });
    if (model === "gpt-3.5-turbo" || model === "gpt-4") {
        const response = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-3.5-turbo",
            max_tokens: 1000,
        });
        const responseText = response.choices[0].message?.content ? response.choices[0].message?.content : 'An error occured. Please try again...';
        //Case 1 : ```\nCode\n```
        //Case 2 : ```jsx\nCode\n```
        //Case 3 : ```Code```
        //Case 4 : Code
        if (responseText) {
            const tripleTicks = '```';
            const firstTicksIndex = responseText.indexOf(tripleTicks);
            const lastTicksIndex = responseText.lastIndexOf(tripleTicks);
            if (firstTicksIndex !== -1 && lastTicksIndex !== -1 && firstTicksIndex < lastTicksIndex) {
                let contentBetweenTicks = responseText.substring(firstTicksIndex + tripleTicks.length, lastTicksIndex);
                if (contentBetweenTicks.startsWith('\n')) {
                    const firstslashn = contentBetweenTicks.indexOf('\n');
                    //return code after slash n and do not include the \n in the begining and end 
                    contentBetweenTicks = contentBetweenTicks.substring(firstslashn + 1);
                    contentBetweenTicks = contentBetweenTicks.substring(0, contentBetweenTicks.length - 1);
                }
                else {
                    const languages = [
                        "python",
                        "java",
                        "javascript",
                        "c",
                        "cpp",
                        "html",
                        "css",
                        "ruby",
                        "php",
                        "swift",
                        "kotlin",
                        "csharp",
                        "typescript",
                        "go",
                        "rust",
                        "dart",
                        "scala",
                        "groovy",
                        "lua",
                        "perl",
                        "bash",
                        "powershell",
                        "elixir",
                        "haskell",
                        "clojure",
                        "r",
                        "vb",
                        "ada",
                        "forth",
                        "cobol",
                        "julia",
                        "racket",
                        "nim",
                        "d"
                    ];
                    // check if content starts  with any of these languages and a \n
                    for (let i = 0; i < languages.length; i++) {
                        if (contentBetweenTicks.startsWith(languages[i])) {
                            contentBetweenTicks = contentBetweenTicks.substring(languages[i].length);
                            break;
                        }
                    }
                    if (contentBetweenTicks.startsWith('\n') && contentBetweenTicks.endsWith('\n')) {
                        contentBetweenTicks = contentBetweenTicks.substring(1, contentBetweenTicks.length - 1);
                    }
                }
                //add commonIndent to all lines here
                const lines = contentBetweenTicks.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    lines[i] = commonIndent + lines[i];
                }
                contentBetweenTicks = lines.join('\n');
                contentBetweenTicks = emptyLinesBefore?.join('') + contentBetweenTicks + emptyLinesAfter?.join('');
                const editor = await vscode.window.showTextDocument(thread.uri);
                if (!editor) {
                    return;
                }
                editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(new vscode.Position(thread.range.start.line, 0), thread.range.end), contentBetweenTicks);
                });
            }
            else {
                const editor = await vscode.window.showTextDocument(thread.uri);
                if (!editor) {
                    return;
                }
                editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(new vscode.Position(thread.range.start.line, 0), thread.range.end), responseText);
                });
            }
        }
        else {
            vscode.window.showErrorMessage('An error occurred. Please try again...');
        }
    }
}
exports.aiEdit = aiEdit;
function findCommonIndent(codeBlock) {
    const lines = codeBlock.split('\n');
    let commonIndent = '';
    let previousIndent = '';
    for (const line of lines) {
        const indent = line.match(/^\s*/)?.[0];
        if (indent && (!commonIndent || commonIndent.length > indent.length) && previousIndent.startsWith(indent)) {
            commonIndent = indent;
        }
        previousIndent = indent ?? '';
    }
    return commonIndent;
}
//# sourceMappingURL=editAI.js.map