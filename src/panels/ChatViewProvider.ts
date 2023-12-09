
import * as vscode from 'vscode';
import { getNonce } from "../utilities/getNonce";
import OpenAI from "openai";


export class ChatViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'DevX';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private apikey : string | undefined,
	) {
		this.openai = new OpenAI({apiKey: this.apikey});
	}
	
	private openai : OpenAI  = new OpenAI({apiKey: this.apikey});

	public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext,_token: vscode.CancellationToken) {
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


	public addFile(filePath: string, fileContents: string) {
	if (this._view) {
        this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
        this._view.webview.postMessage({ type: 'addFile', filePath, fileContents });
	}
	}

	public addSelection(filePath: string, fileContents: string) {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'addFile', filePath, fileContents });
		}
		}
	
	public setApiKey (apiKey : string) {
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'setApiKey', apiKey });
		}
	}

	public updateGPTResponse( response : string) {	
		if (this._view) {
			this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
			this._view.webview.postMessage({ type: 'updateGPTResponse', response });
		}
		//console.log(response);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
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

	private async generateText(
		reactMessages: { id: string; text: string }[],
		referencedFiles: {
			[key: string]: {
			path: string;
			contents: string;
			};
		}[]
	) {	
	const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
	//console.log(referencedFiles);
	
	Object.values(referencedFiles).forEach(file => {
			messages.push({role: "user", content: file.path + "```" + file.contents + "```" });
		});
	
	
	reactMessages.forEach(message => {
		if (message.id === 'user'){
			messages.push({role: "user", content: message.text});
		}
		else if (message.id === 'assistant'){
			messages.push({role: "assistant", content: message.text});
		}
	});
	
	const completion = await this.openai.chat.completions.create({
		model: "gpt-3.5-turbo",
		messages : messages,
		stream : true
	});
	
	let answerString = "";
	for await (const chunk of completion) 
		{
		if (chunk.choices[0]?.delta?.content) {

			answerString += chunk.choices[0].delta.content;
			this.updateGPTResponse(answerString);
			}
		}
	}

}
