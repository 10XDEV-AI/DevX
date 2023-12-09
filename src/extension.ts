import { ExtensionContext, languages, commands, Disposable, workspace, window } from 'vscode';
import * as vscode from 'vscode';
import OpenAI from "openai";
import { aiEdit } from './utilities/editAI';
import { askAI } from './utilities/askAI';
import {ChatViewProvider} from './panels/ChatViewProvider';
import { CodelensProvider } from './CodelensProvider';

export const greenDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(0, 255, 0, 0.2)',
isWholeLine: true,
});

export const redDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 0, 0, 0.2)', // Red background for removed lines
isWholeLine: true,
});

function applyDecorations(uri: vscode.Uri) {

  const addedLines: vscode.DecorationOptions[] = [];
  const removedLines: vscode.DecorationOptions[] = [];

  const editor = vscode.window.activeTextEditor;

  if (!editor) {
      return;
  }
//get text from range
const lines = editor.document.getText().split('\n');

lines.forEach((line, index) => {
      const lineNumber = index;
      const lineLength = line.length;

      if (line.startsWith('+')) {
          addedLines.push({
              range: new vscode.Range(lineNumber, 0, lineNumber, lineLength),
          });
      } else if (line.startsWith('-')) {
          removedLines.push({
              range: new vscode.Range(lineNumber, 0, lineNumber, lineLength),
          });
      }
  else if (line.startsWith(' ')) {
    //do nothing
  
  }
  });

  editor.setDecorations(greenDecoration, addedLines);
  editor.setDecorations(redDecoration, removedLines);
}


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
  let apiKey : string | undefined = '';

  // Workspace settings override User settings when getting the setting.
	if (vscode.workspace.getConfiguration('devxai').get('ApiKey') === "" 
  || !(await validateAPIKey())) {
    apiKey = await showInputBox();
    await vscode.workspace.getConfiguration('devxai').update('ApiKey', apiKey, true);
  }
  else{
    apiKey = vscode.workspace.getConfiguration('devxai').get('ApiKey') as string | undefined;
  }
  

  const codelensProvider = new CodelensProvider();

  languages.registerCodeLensProvider("*", codelensProvider);

  const provider = new ChatViewProvider(context.extensionUri, apiKey);

  context.subscriptions.push(vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider));

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

  vscode.window.onDidChangeTextEditorSelection(async (e) => {
    applyDecorations(e.textEditor.document.uri);
  }
  );
    
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
        const fileContents = editor.document.getText();
        console.log(`Adding file to DevX: ${filePath}`);
        provider.addFile(filePath.toString(), fileContents);
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('mywiki.addSelection', (uri: vscode.Uri) => {
    const editor = vscode.window.activeTextEditor;
          if (editor) {
              const filePath = editor.document.uri.fsPath;
              const selectedText = editor.document.getText(editor.selection);
              console.log(`Adding selection to DevX: ${selectedText} from file ${filePath.toString()}`);
              provider.addSelection(filePath.toString(), selectedText);
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
      thread.dispose();
    });
  }));

  context.subscriptions.push(vscode.commands.registerCommand('mywiki.Accept', (uri: vscode.Uri, range: vscode.Range) => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
    const rangeText = editor.document.getText(range);
    console.log(`Accepting: ${rangeText}`);
    const lines = rangeText.split('\n');
    const linesToAccept: string[] = [];
    for (const line of lines) {
      if (line.startsWith('+')|| line.startsWith(' ')){ 
        linesToAccept.push(line.substring(1));
      }
    }
    editor.edit(editBuilder => {
      editBuilder.replace(range, linesToAccept.join('\n'));
    });
    
    applyDecorations(editor.document.uri);
    }
  }));


  context.subscriptions.push(vscode.commands.registerCommand('mywiki.Reject', (uri: vscode.Uri, range: vscode.Range) => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
    const rangeText = editor.document.getText(range);
    console.log(`Accepting: ${rangeText}`);
    const lines = rangeText.split('\n');
    const linesToAccept: string[] = [];
    for (const line of lines) {
      if (line.startsWith('-')|| line.startsWith(' ')){ 
        linesToAccept.push(line.substring(1));
      }
    }
    editor.edit(editBuilder => {
      editBuilder.replace(range, linesToAccept.join('\n'));
    });

    applyDecorations(editor.document.uri);
    }
  }));


  context.subscriptions.push(vscode.commands.registerCommand('mywiki.Merge', (uri: vscode.Uri, range: vscode.Range) => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
    const rangeText = editor.document.getText(range);
    console.log(`Accepting: ${rangeText}`);
    const lines = rangeText.split('\n');
    const linesToAccept: string[] = [];
    for (const line of lines) {
      if (line.startsWith('+')|| line.startsWith('-')){ 
        linesToAccept.push(line.substring(1));
      }
    }
    editor.edit(editBuilder => {
      editBuilder.replace(range, linesToAccept.join('\n'));
    });
    }
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

	commands.registerCommand("codelens-sample.codelensAction", (args: any) => {
		window.showInformationMessage(`CodeLens action clicked with args=${args}`);
	});

  context.subscriptions.push(vscode.commands.registerCommand('mywiki.dispose', () => {
    commentController.dispose();
  }));

}
