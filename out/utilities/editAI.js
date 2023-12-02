"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiEdit = exports.addDiffsToCode = exports.redDecoration = exports.greenDecoration = void 0;
const vscode = require("vscode");
const openai_1 = require("openai");
const diff = require("git-diff");
exports.greenDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    isWholeLine: true,
});
exports.redDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    isWholeLine: true,
});
function applyDecorations(range, diff) {
    const addedLines = [];
    const removedLines = [];
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const startLine = range.start.line;
    const lines = diff.split('\n');
    lines.forEach((line, index) => {
        const lineNumber = startLine + index;
        const lineLength = line.length;
        if (line.startsWith('+')) {
            addedLines.push({
                range: new vscode.Range(lineNumber, 0, lineNumber, lineLength),
            });
        }
        else if (line.startsWith('-')) {
            removedLines.push({
                range: new vscode.Range(lineNumber, 0, lineNumber, lineLength),
            });
        }
    });
    editor.setDecorations(exports.greenDecoration, addedLines);
    editor.setDecorations(exports.redDecoration, removedLines);
}
function transformCodeDiff(codeDiff) {
    const lines = codeDiff.split('\n');
    let result = '';
    let inAddedBlock = false;
    let inRemovedBlock = false;
    for (const line of lines) {
        if (line.startsWith('+')) {
            if (inRemovedBlock) {
                result += '<<<<<<<\n';
                inRemovedBlock = false;
            }
            if (!inAddedBlock) {
                result += '>>>>>>>\n';
                inAddedBlock = true;
            }
            result += line.substring(1) + '\n';
        }
        else if (line.startsWith('-')) {
            if (!inRemovedBlock) {
                result += '=======\n';
                inRemovedBlock = true;
            }
            if (inAddedBlock) {
                result += '=======\n';
                inAddedBlock = false;
            }
            result += line.substring(1) + '\n';
        }
        else {
            if (inAddedBlock) {
                result += '=======\n';
                inAddedBlock = false;
            }
            if (inRemovedBlock) {
                result += '<<<<<<<\n';
                inRemovedBlock = false;
            }
            result += line.substring(1) + '\n';
        }
    }
    if (inAddedBlock) {
        result += '=======\n';
    }
    if (inRemovedBlock) {
        result += '<<<<<<<\n';
    }
    return result;
}
function addDiffsToCode(old_code_block, new_code_block) {
    const options = {
        color: false,
        flags: "",
        forceFake: true,
        noHeaders: true,
        save: false,
        wordDiff: false // Get a word diff instead of a line diff?
    };
    let diffOutput = diff(old_code_block, new_code_block, options);
    console.log(old_code_block);
    console.log(new_code_block);
    console.log(diffOutput);
    if (undefined !== diffOutput) {
        if (diffOutput.includes('\n\\ No newline at end of file')) {
            diffOutput = diffOutput.replaceAll('\n\\ No newline at end of file', '');
        }
        return diffOutput;
    }
    return '';
}
exports.addDiffsToCode = addDiffsToCode;
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
    // Split the code block into lines
    const lines = codeBlock.split('\n');
    // Find the index of the first non-empty line
    let firstNonEmptyIndex = 0;
    while (firstNonEmptyIndex < lines.length && lines[firstNonEmptyIndex].trim() === '') {
        firstNonEmptyIndex++;
    }
    // Find the index of the last non-empty line
    let lastNonEmptyIndex = lines.length - 1;
    while (lastNonEmptyIndex >= 0 && lines[lastNonEmptyIndex].trim() === '') {
        lastNonEmptyIndex--;
    }
    //store the empty lines before in a string 
    const emptyLinesBefore = lines.slice(0, firstNonEmptyIndex).join('\n');
    const emptyLinesAfter = lines.slice(lastNonEmptyIndex + 1).join('\n');
    // Extract the non-empty lines
    const trimmedLines = lines.slice(firstNonEmptyIndex, lastNonEmptyIndex + 1);
    // Join the non-empty lines back together
    codeBlock = trimmedLines.join('\n');
    const codeBlockWithCommonIndent = codeBlock;
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
                        "script",
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
                        "d",
                        "gitignore"
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
                contentBetweenTicks = emptyLinesBefore + contentBetweenTicks + emptyLinesAfter;
                const editor = await vscode.window.showTextDocument(thread.uri);
                const diffs = addDiffsToCode(codeBlockWithCommonIndent, contentBetweenTicks);
                if (!editor) {
                    return;
                }
                editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(new vscode.Position(thread.range.start.line, 0), thread.range.end), diffs);
                });
                //calculate the new range in which the diff string is placed
                const newRange = new vscode.Range(new vscode.Position(thread.range.start.line, 0), new vscode.Position(thread.range.start.line + diffs.split('\n').length, 0));
                applyDecorations(newRange, diffs);
            }
            else {
                const editor = await vscode.window.showTextDocument(thread.uri);
                if (!editor) {
                    return;
                }
                const diffs = addDiffsToCode(codeBlockWithCommonIndent, responseText);
                editor.edit(editBuilder => {
                    editBuilder.replace(new vscode.Range(new vscode.Position(thread.range.start.line, 0), thread.range.end), diffs);
                });
                //calculate the new range in which the diff string is placed
                const newRange = new vscode.Range(new vscode.Position(thread.range.start.line, 0), new vscode.Position(thread.range.start.line + diffs.split('\n').length + 1, 0));
                applyDecorations(newRange, diffs);
            }
        }
        else {
            vscode.window.showErrorMessage('An error occurred. Please try again...');
        }
    }
}
exports.aiEdit = aiEdit;
function findCommonIndent(codeBlock) {
    const lines = codeBlock.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
    if (lines.length === 0) {
        return ''; // No lines, so no indent
    }
    const indents = lines.map(line => line.match(/^\s*/)?.[0] ?? ''); // Extract indents
    const smallestIndent = indents.reduce((smallest, current) => (current.length < smallest.length ? current : smallest), indents[0]);
    return smallestIndent;
}
//# sourceMappingURL=editAI.js.map