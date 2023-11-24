import { ExtensionContext } from "vscode";
import * as vscode from 'vscode';
import OpenAI from "openai";
import { aiEdit } from './utilities/editAI';
import { askAI } from './utilities/askAI';
import {ChatViewProvider} from './panels/ChatViewProvider';

let commentId = 1;
 
export class NoteComment implements vscode.Comment {
	id: number;
	label: string | undefined;
	savedBody: string | vscode.MarkdownString; // for the Cancel button

	constructor(
		public body: string | vscode.MarkdownString,
		public mode: vscode.CommentMode,
		public author: vscode.CommentAuthorInformation,
		public parent?: vscode.CommentThread,
		public contextValue?: string,
	) {
		this.id = ++commentId;
		this.savedBody = this.body;
	}
}



/**
 * Shows an input box for getting API key using window.showInputBox().
 * Checks if inputted API Key is valid.
 * Updates the User Settings API Key with the newly inputted API Key.
 */
export async function showInputBox() {
	const result = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		placeHolder: 'Your OpenAI API Key',
		title: 'DevX Copilot',
		prompt: 'You have not set your OpenAI API key yet or your API key is incorrect, please enter your API key to use the DevX AI extension.',
		validateInput: async text => {
			
			if (text === '') {
				return 'The API Key can not be empty';
			}

			console.log('Hi');
			const openai = new OpenAI({
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

			} catch (err) {
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


async function validateAPIKey() {
	try {
		const apiKey: string | undefined = vscode.workspace.getConfiguration('devxai').get('ApiKey') as string | undefined;
			const openai = new OpenAI({
				apiKey: apiKey,
			});  
			openai.models.list();
	}
	catch(err) {
		return false;
	}
	return true;
}


export async function activate(context: ExtensionContext) {

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
  provideCommentingRanges: (document: vscode.TextDocument, token: vscode.CancellationToken) => {
    const lineCount = document.lineCount;
    return [new vscode.Range(0, 0, lineCount - 1, 0)];
  }
};

commentController.options = {
  prompt: "Ask DevX...",
  placeHolder: "Ask me to edit or explain code"
};

let thread: vscode.CommentThread | undefined;

vscode.window.onDidChangeTextEditorSelection(async (e) => {
  //console.log(e.textEditor.document.fileName);
  if (thread !== undefined) {
    if (!e.textEditor.document.fileName.includes('commentinput')) {
      thread.dispose();
      thread = undefined;
    }
  }
});
  
context.subscriptions.push(vscode.commands.registerCommand('mywiki.askAI', (reply: vscode.CommentReply) => {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Generating AI response...",
    cancellable: true
  }, async () => {
    await askAI(reply);		
    thread = reply.thread;
  });
}));


context.subscriptions.push(vscode.commands.registerCommand('mywiki.addFile', (uri: vscode.Uri) => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
      const filePath = editor.document.uri.fsPath;
      console.log(`Adding file to DevX: ${filePath}`);
  }
}));

context.subscriptions.push(vscode.commands.registerCommand('mywiki.addSelection', (uri: vscode.Uri) => {
  const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selectedText = editor.document.getText(editor.selection);
            // Add logic to add the selected text to DevX
            console.log(`Adding selection to DevX: ${selectedText}`);
        }
}));


context.subscriptions.push(vscode.commands.registerCommand('mywiki.aiEdit', (reply: vscode.CommentReply) => {
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Generating AI response...",
    cancellable: true
  }, async () => {
    await aiEdit(reply);
    thread = reply.thread;
  });
}));


context.subscriptions.push(vscode.commands.registerCommand('mywiki.deleteNoteComment', (comment: NoteComment) => {
  const thread = comment.parent;
  if (!thread) {
    return;
  }

  thread.comments = thread.comments.filter(cmt => (cmt as NoteComment).id !== comment.id);

  if (thread.comments.length === 0) {
    thread.dispose();
  }
}));

context.subscriptions.push(vscode.commands.registerCommand('mywiki.deleteNote', (thread: vscode.CommentThread) => {
  thread.dispose();
}));

context.subscriptions.push(vscode.commands.registerCommand('mywiki.inline.new', async () => {
  // move focus line to the end of the current selection
  await vscode.commands.executeCommand('cursorLineEndSelect');
  await vscode.commands.executeCommand('workbench.action.addComment');
}));

context.subscriptions.push(vscode.commands.registerCommand('mywiki.cancelsaveNote', (comment: NoteComment) => {
  if (!comment.parent) {
    return;
  }

  comment.parent.comments = comment.parent.comments.map(cmt => {
    if ((cmt as NoteComment).id === comment.id) {
      cmt.body = (cmt as NoteComment).savedBody;
      cmt.mode = vscode.CommentMode.Preview;
    }

    return cmt;
  });
}));

context.subscriptions.push(vscode.commands.registerCommand('mywiki.saveNote', (comment: NoteComment) => {
  if (!comment.parent) {
    return;
  }

  comment.parent.comments = comment.parent.comments.map(cmt => {
    if ((cmt as NoteComment).id === comment.id) {
      (cmt as NoteComment).savedBody = cmt.body;
      cmt.mode = vscode.CommentMode.Preview;
    }

    return cmt;
  });
}));

context.subscriptions.push(vscode.commands.registerCommand('mywiki.editNote', (comment: NoteComment) => {
  if (!comment.parent) {
    return;
  }

  comment.parent.comments = comment.parent.comments.map(cmt => {
    if ((cmt as NoteComment).id === comment.id) {
      cmt.mode = vscode.CommentMode.Editing;
    }

    return cmt;
  });
}));

context.subscriptions.push(vscode.commands.registerCommand('mywiki.dispose', () => {
  commentController.dispose();
}));

const provider = new ChatViewProvider(context.extensionUri);

context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider));

}

