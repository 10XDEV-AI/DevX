"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewProvider = void 0;
const vscode = require("vscode");
const getNonce_1 = require("../utilities/getNonce");
const openai_1 = require("openai");
class ChatViewProvider {
    constructor(_extensionUri, apikey) {
        this._extensionUri = _extensionUri;
        this.apikey = apikey;
        this.openai = new openai_1.default({ apiKey: this.apikey });
        this.openai = new openai_1.default({ apiKey: this.apikey });
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
                case 'setMessages':
                    {
                        //console.log('Recieved from React');
                        //console.log(data.messages);
                        //console.log(data.files);
                        this.generateText(data.messages, data.files);
                        break;
                    }
            }
        });
    }
    addFile(filePath, fileContents) {
        if (this._view) {
            this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
            this._view.webview.postMessage({ type: 'addFile', filePath, fileContents });
        }
    }
    addSelection(filePath, fileContents) {
        if (this._view) {
            this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
            this._view.webview.postMessage({ type: 'addFile', filePath, fileContents });
        }
    }
    setApiKey(apiKey) {
        if (this._view) {
            this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
            this._view.webview.postMessage({ type: 'setApiKey', apiKey });
        }
    }
    updateGPTResponse(response) {
        if (this._view) {
            this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
            this._view.webview.postMessage({ type: 'updateGPTResponse', response });
        }
        //console.log(response);
    }
    _getHtmlForWebview(webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-ui/build/static/js/main.js'));
        const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview-ui/build/static/css/main.css'));
        // Use a nonce to only allow a specific script to be run.
        const nonce = (0, getNonce_1.getNonce)();
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
    async generateText(reactMessages, referencedFiles) {
        const messages = [];
        //console.log(referencedFiles);
        Object.values(referencedFiles).forEach(file => {
            messages.push({ role: "user", content: file.path + "```" + file.contents + "```" });
        });
        reactMessages.forEach(message => {
            if (message.id === 'user') {
                messages.push({ role: "user", content: message.text });
            }
            else if (message.id === 'assistant') {
                messages.push({ role: "assistant", content: message.text });
            }
        });
        const completion = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            stream: true
        });
        let answerString = "";
        for await (const chunk of completion) {
            if (chunk.choices[0]?.delta?.content) {
                answerString += chunk.choices[0].delta.content;
                this.updateGPTResponse(answerString);
            }
        }
    }
}
exports.ChatViewProvider = ChatViewProvider;
ChatViewProvider.viewType = 'DevX';
//# sourceMappingURL=ChatViewProvider.js.map