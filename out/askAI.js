"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAI = void 0;
const vscode = require("vscode");
const openai_1 = require("openai");
const extension_1 = require("./extension");
/**
 * Gets the highlighted code for this comment thread
 * @param thread
 * @returns
 */
async function getCommentThreadCode(thread) {
    const document = await vscode.workspace.openTextDocument(thread.uri);
    // Get selected code for the comment thread
    return document.getText(thread.range).trim();
}
/**
 * Updates the thread periodically with the answerString using newer chunks.
 * @param answerString The string containing the AI response.
 * @param thread The comment thread to update.
 */
async function updateThread(answerString, thread) {
    const AIComment = thread.comments[thread.comments.length - 1];
    await new Promise((resolve) => setTimeout(resolve, 500));
    AIComment.body = new vscode.MarkdownString(answerString);
    thread.comments = [...thread.comments];
}
/**
 * User replies with a question.
 * The question + conversation history + code block then gets used
 * as input to call the OpenAI API to get a response.
 * The new humna question and AI response then gets added to the thread.
 * @param reply
 */
async function askAI(reply) {
    const question = reply.text.trim();
    const thread = reply.thread;
    const model = vscode.workspace.getConfiguration('devxai').get('models') + "";
    const messages = [];
    const codeBlock = await getCommentThreadCode(thread);
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
    const humanComment = new extension_1.NoteComment(new vscode.MarkdownString(question), vscode.CommentMode.Preview, { name: 'VS Code', iconPath: vscode.Uri.parse("https://img.icons8.com/fluency/96/null/user-male-circle.png") }, thread, thread.comments.length ? 'canDelete' : undefined);
    thread.comments = [...thread.comments, humanComment];
    const apiKey = vscode.workspace.getConfiguration('devxai').get('ApiKey');
    const openai = new openai_1.default({
        apiKey: apiKey,
    });
    if (model === "gpt-3.5-turbo" || model === "gpt-4") {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            stream: true
        });
        const AIComment = new extension_1.NoteComment(new vscode.MarkdownString(""), vscode.CommentMode.Preview, { name: 'DevX AI', iconPath: vscode.Uri.parse("https://i.postimg.cc/Y21dmVTh/Vector.png") }, thread, thread.comments.length ? 'canDelete' : undefined);
        thread.comments = [...thread.comments, AIComment];
        let answerString = "";
        for await (const chunk of completion) {
            if (chunk.choices[0]?.delta?.content) {
                answerString += chunk.choices[0].delta.content;
                updateThread(answerString, thread);
            }
        }
    }
}
exports.askAI = askAI;
//# sourceMappingURL=askAI.js.map