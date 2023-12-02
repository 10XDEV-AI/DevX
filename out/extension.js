"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.showInputBox = exports.NoteComment = void 0;
const vscode_1 = require("vscode");
const vscode = require("vscode");
const openai_1 = require("openai");
const editAI_1 = require("./utilities/editAI");
const askAI_1 = require("./utilities/askAI");
const ChatViewProvider_1 = require("./panels/ChatViewProvider");
const CodelensProvider_1 = require("./CodelensProvider");
let commentId = 1;
class NoteComment {
    constructor(body, mode, author, parent, contextValue) {
        this.body = body;
        this.mode = mode;
        this.author = author;
        this.parent = parent;
        this.contextValue = contextValue;
        this.id = ++commentId;
        this.savedBody = this.body;
    }
}
exports.NoteComment = NoteComment;
/**
 * Shows an input box for getting API key using window.showInputBox().
 * Checks if inputted API Key is valid.
 * Updates the User Settings API Key with the newly inputted API Key.
 */
async function showInputBox() {
    const result = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        placeHolder: 'Your OpenAI API Key',
        title: 'DevX Copilot',
        prompt: 'You have not set your OpenAI API key yet or your API key is incorrect, please enter your API key to use the DevX AI extension.',
        validateInput: async (text) => {
            if (text === '') {
                return 'The API Key can not be empty';
            }
            console.log('Hi');
            const openai = new openai_1.default({
                apiKey: text,
            });
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            "role": "user",
                            "content": "hi"
                        }
                    ],
                    temperature: 1,
                    max_tokens: 256,
                    top_p: 1,
                    frequency_penalty: 0,
                    presence_penalty: 0,
                });
                // You can add additional validation logic here based on the response if needed
            }
            catch (err) {
                return 'Your API key is invalid';
            }
            return null;
        }
    });
    vscode.window.showInformationMessage(`Got: ${result}`);
    // Write to user settings
    await vscode.workspace.getConfiguration('devxai').update('ApiKey', result, true);
    return result;
}
exports.showInputBox = showInputBox;
async function validateAPIKey() {
    try {
        const apiKey = vscode.workspace.getConfiguration('devxai').get('ApiKey');
        const openai = new openai_1.default({
            apiKey: apiKey,
        });
        openai.models.list();
    }
    catch (err) {
        return false;
    }
    return true;
}
async function activate(context) {
    // Workspace settings override User settings when getting the setting.
    if (vscode.workspace.getConfiguration('devxai').get('ApiKey') === ""
        || !(await validateAPIKey())) {
        const apiKey = await showInputBox();
        await vscode.workspace.getConfiguration('devxai').update('ApiKey', apiKey, true);
    }
    const codelensProvider = new CodelensProvider_1.CodelensProvider();
    vscode_1.languages.registerCodeLensProvider("*", codelensProvider);
    const provider = new ChatViewProvider_1.ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatViewProvider_1.ChatViewProvider.viewType, provider));
    // A `CommentController` is able to provide comments for documents.
    const commentController = vscode.comments.createCommentController('comment-devxai', 'devxai Comment Controller');
    context.subscriptions.push(commentController);
    // A `CommentingRangeProvider` controls where gutter decorations that allow adding comments are shown
    commentController.commentingRangeProvider = {
        provideCommentingRanges: (document, token) => {
            const lineCount = document.lineCount;
            return [new vscode.Range(0, 0, lineCount - 1, 0)];
        }
    };
    commentController.options = {
        prompt: "Ask DevX...",
        placeHolder: "Ask me to edit or explain code"
    };
    let thread;
    vscode.window.onDidChangeTextEditorSelection(async (e) => {
        //console.log(e.textEditor.document.fileName);
        if (thread !== undefined) {
            if (!e.textEditor.document.fileName.includes('commentinput')) {
                thread.dispose();
                thread = undefined;
            }
        }
    });
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.askAI', (reply) => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating AI response...",
            cancellable: true
        }, async () => {
            await (0, askAI_1.askAI)(reply);
            thread = reply.thread;
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.addFile', (uri) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const filePath = editor.document.uri.fsPath;
            const fileContents = editor.document.getText();
            console.log(`Adding file to DevX: ${filePath}`);
            provider.addFile(filePath.toString(), fileContents);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.addSelection', (uri) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const filePath = editor.document.uri.fsPath;
            const selectedText = editor.document.getText(editor.selection);
            console.log(`Adding selection to DevX: ${selectedText} from file ${filePath.toString()}`);
            provider.addSelection(filePath.toString(), selectedText);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.aiEdit', (reply) => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating AI response...",
            cancellable: true
        }, async () => {
            await (0, editAI_1.aiEdit)(reply);
            thread = reply.thread;
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.Accept', (uri, range) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const rangeText = editor.document.getText(range);
            console.log(`Accepting: ${rangeText}`);
            const lines = rangeText.split('\n');
            const linesToAccept = [];
            for (const line of lines) {
                if (line.startsWith('+') || line.startsWith(' ')) {
                    linesToAccept.push(line.substring(1));
                }
            }
            editor.edit(editBuilder => {
                editBuilder.replace(range, linesToAccept.join('\n'));
            });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.Reject', (uri, range) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const rangeText = editor.document.getText(range);
            console.log(`Accepting: ${rangeText}`);
            const lines = rangeText.split('\n');
            const linesToAccept = [];
            for (const line of lines) {
                if (line.startsWith('-') || line.startsWith(' ')) {
                    linesToAccept.push(line.substring(1));
                }
            }
            editor.edit(editBuilder => {
                editBuilder.replace(range, linesToAccept.join('\n'));
            });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.Merge', (uri, range) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const rangeText = editor.document.getText(range);
            console.log(`Accepting: ${rangeText}`);
            const lines = rangeText.split('\n');
            const linesToAccept = [];
            for (const line of lines) {
                if (line.startsWith('+') || line.startsWith('-')) {
                    linesToAccept.push(line.substring(1));
                }
            }
            editor.edit(editBuilder => {
                editBuilder.replace(range, linesToAccept.join('\n'));
            });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.deleteNoteComment', (comment) => {
        const thread = comment.parent;
        if (!thread) {
            return;
        }
        thread.comments = thread.comments.filter(cmt => cmt.id !== comment.id);
        if (thread.comments.length === 0) {
            thread.dispose();
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.deleteNote', (thread) => {
        thread.dispose();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.inline.new', async () => {
        // move focus line to the end of the current selection
        await vscode.commands.executeCommand('cursorLineEndSelect');
        await vscode.commands.executeCommand('workbench.action.addComment');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.cancelsaveNote', (comment) => {
        if (!comment.parent) {
            return;
        }
        comment.parent.comments = comment.parent.comments.map(cmt => {
            if (cmt.id === comment.id) {
                cmt.body = cmt.savedBody;
                cmt.mode = vscode.CommentMode.Preview;
            }
            return cmt;
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.saveNote', (comment) => {
        if (!comment.parent) {
            return;
        }
        comment.parent.comments = comment.parent.comments.map(cmt => {
            if (cmt.id === comment.id) {
                cmt.savedBody = cmt.body;
                cmt.mode = vscode.CommentMode.Preview;
            }
            return cmt;
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.editNote', (comment) => {
        if (!comment.parent) {
            return;
        }
        comment.parent.comments = comment.parent.comments.map(cmt => {
            if (cmt.id === comment.id) {
                cmt.mode = vscode.CommentMode.Editing;
            }
            return cmt;
        });
    }));
    vscode_1.commands.registerCommand("codelens-sample.codelensAction", (args) => {
        vscode_1.window.showInformationMessage(`CodeLens action clicked with args=${args}`);
    });
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.dispose', () => {
        commentController.dispose();
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map