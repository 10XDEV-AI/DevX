"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.showInputBox = exports.NoteComment = void 0;
const vscode_1 = require("vscode");
const vscode = require("vscode");
const HelloWorldPanel_1 = require("./panels/HelloWorldPanel");
const openai_1 = require("openai");
const editAI_1 = require("./editAI");
const askAI_1 = require("./askAI");
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
    // Create the show hello world command
    const showHelloWorldCommand = vscode_1.commands.registerCommand("hello-world.showHelloWorld", () => {
        HelloWorldPanel_1.HelloWorldPanel.render(context.extensionUri);
    });
    // Add command to the extension context
    context.subscriptions.push(showHelloWorldCommand);
    // Workspace settings override User settings when getting the setting.
    if (vscode.workspace.getConfiguration('devxai').get('ApiKey') === ""
        || !(await validateAPIKey())) {
        const apiKey = await showInputBox();
        await vscode.workspace.getConfiguration('devxai').update('ApiKey', apiKey, true);
    }
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
    context.subscriptions.push(vscode.commands.registerCommand('mywiki.dispose', () => {
        commentController.dispose();
    }));
    const provider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider));
}
exports.activate = activate;
class ChatViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'colorSelected':
                    {
                        vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
                        break;
                    }
            }
        });
    }
    addColor() {
        if (this._view) {
            this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
            this._view.webview.postMessage({ type: 'addColor' });
        }
    }
    clearColors() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearColors' });
        }
    }
    _getHtmlForWebview(webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-ui/build/static/js/main.js'));
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-ui/build/static/css/main.css'));
        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();
        return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
        <meta name="theme-color" content="#000000">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <link rel="stylesheet" type="text/css" href="${stylesUri}">
        <title>Hello World</title>
      </head>
      <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>`;
    }
}
ChatViewProvider.viewType = 'DevX';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=extension.js.map