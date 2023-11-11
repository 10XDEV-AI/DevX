'use strict';

import * as vscode from 'vscode';
import OpenAI from "openai";

let commentId = 1;

class NoteComment implements vscode.Comment {
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
			vscode.window.showInformationMessage(`Validating: ${text}`);
			if (text === '') {
				return 'The API Key can not be empty';
			}
			
			const apiKey: string | undefined = vscode.workspace.getConfiguration('devxai').get('ApiKey') as string | undefined;
			const openai = new OpenAI({
				apiKey: apiKey,
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

export async function activate(context: vscode.ExtensionContext) {
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
		if (thread !== undefined) {
				if (!e.textEditor.document.fileName.startsWith('/commentinput')) {
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


	/**
	 * Generates the prompt to pass to OpenAI ChatGPT API.
	 * Prompt includes: 
	 * - Role play text that gives context to AI
	 * - Code block highlighted for the comment thread
	 * - All of past conversation history + example conversation
	 * - User's new question
	 * @param question
	 * @param thread 
	 * @returns 
	 */
	async function generatePromptChatGPT(question: string, thread: vscode.CommentThread) {
		const messages = [];
		//const rolePlay =
		//	"I want you to act as a highly intelligent AI chatbot that has deep understanding of any coding language and its API documentations. I will provide you with a code block and your role is to provide a comprehensive answer to any questions or requests that I will ask about the code block. Please answer in as much detail as possible and not be limited to brevity. It is very important that you provide verbose answers and answer in markdown format.";
		const codeBlock = await getCommentThreadCode(thread);
		if (codeBlock !== undefined) {
			messages.push({"role" : "user", "content" : "```\n" + codeBlock + "\n```"});
		}
		const filteredComments = thread.comments.filter(comment => comment.label !== "NOTE");

		for (let i = Math.max(0, filteredComments.length - 8); i < filteredComments.length; i++) {
				if (filteredComments[i].author.name === "VS Code") {
					messages.push({"role" : "user", "content" : `${(filteredComments[i].body as vscode.MarkdownString).value}`});
				} else if (filteredComments[i].author.name === "DEVX AI") {
					messages.push({"role" : "assistant", "content" : `${(filteredComments[i].body as vscode.MarkdownString).value}`});
				}
		}
		messages.push({"role" : "user", "content" : `${question}`});

		return messages; 
	}
    
	

	/**
	 * Generates the prompt to pass to OpenAI ChatGPT API.
	 * Prompt includes: 
	 * - Role play text that gives context to AI
	 * - Code block highlighted for the comment thread
	 * - All of past conversation history + example conversation
	 * - User's new question
	 * @param question
	 * @param thread 
	 * @returns 
	 */
	async function generatePromptChatGPTEdit(question: string, thread: vscode.CommentThread) {
		const messages= [];
		//const rolePlay =
		//	"I want you to act as a highly intelligent AI chatbot that has deep understanding of any coding language and its API documentations. I will provide you with a code block and your role is to provide a comprehensive answer to any questions or requests that I will ask about the code block. Please answer in as much detail as possible and not be limited to brevity. It is very important that you provide verbose answers and answer in markdown format.";
		const codeBlock = await getCommentThreadCode(thread);
		
		messages.push({"role" : "system", "content" : "Return fully edited code as per user request delimitted by tripple quotes and nothing else."});
		messages.push({"role" : "user", "content" : "```\n" + codeBlock + "\n```"});
		
		const filteredComments = thread.comments.filter(comment => comment.label !== "NOTE");

		for (let i = Math.max(0, filteredComments.length - 8); i < filteredComments.length; i++) {
				if (filteredComments[i].author.name === "VS Code") {
					messages.push({"role" : "user", "content" : `${(filteredComments[i].body as vscode.MarkdownString).value}`});
				} else if (filteredComments[i].author.name === "DEVX AI") {
					messages.push({"role" : "assistant", "content" : `${(filteredComments[i].body as vscode.MarkdownString).value}`});
				}
		}
		messages.push({"role" : "user", "content" : `${question}`});

		return messages; 
	}


	/**
	 * Gets the highlighted code for this comment thread
	 * @param thread
	 * @returns 
	 */
	async function getCommentThreadCode(thread: vscode.CommentThread) {
		const document = await vscode.workspace.openTextDocument(thread.uri);
		// Get selected code for the comment thread
		return document.getText(thread.range).trim();
	}

	/**
	 * User replies with a question.
	 * The question + conversation history + code block then gets used
	 * as input to call the OpenAI API to get a response.
	 * The new humna question and AI response then gets added to the thread.
	 * @param reply 
	 */
	async function askAI(reply: vscode.CommentReply) {
		const question = reply.text.trim();
		const thread = reply.thread;
		const model = vscode.workspace.getConfiguration('devxai').get('models') + "";
		
		let chatGPTPrompt = [];
		chatGPTPrompt = await generatePromptChatGPT(question, thread);
		
		const humanComment = new NoteComment(new vscode.MarkdownString(question), vscode.CommentMode.Preview, { name: 'VS Code', iconPath: vscode.Uri.parse("https://img.icons8.com/fluency/96/null/user-male-circle.png") }, thread, thread.comments.length ? 'canDelete' : undefined);
		thread.comments = [...thread.comments, humanComment];
		
		const apiKey: string | undefined = vscode.workspace.getConfiguration('devxai').get('ApiKey') as string | undefined;
			const openai = new OpenAI({
				apiKey: apiKey,
			});  

		if (model === "gpt-3.5-turbo" || model === "gpt-4") {
			const response = await openai.chat.completions.create({
				model: model,
				messages: chatGPTPrompt,
				temperature: 1,
				max_tokens: 1000,
				top_p: 1.0,
				frequency_penalty: 1,
				presence_penalty: 1,
			});

			const responseText = response.data.choices[0].message?.content ? response.data.choices[0].message?.content : 'An error occured. Please try again...';
			
			const AIComment = new NoteComment(new vscode.MarkdownString(responseText.trim()), vscode.CommentMode.Preview, { name: 'DevX AI', iconPath: vscode.Uri.parse("https://i.postimg.cc/Y21dmVTh/Vector.png") }, thread, thread.comments.length ? 'canDelete' : undefined);
			thread.comments = [...thread.comments, AIComment];
		} 
	}

	/**
	 * AI will edit the highlighted code based on the given instructions.
	 * Uses the OpenAI Edits endpoint. Replaces the highlighted code
	 * with AI generated code. You can undo to go back.
	 * 
	 * @param reply 
	 * @returns 
	 */
	async function aiEdit(reply: vscode.CommentReply) {
		
		const question = reply.text.trim();
		const thread = reply.thread;
		const model = vscode.workspace.getConfiguration('devxai').get('models') + "";
		
		let chatGPTPrompt = [];
		chatGPTPrompt = await generatePromptChatGPTEdit(question, thread);
		
		const apiKey: string | undefined = vscode.workspace.getConfiguration('devxai').get('ApiKey') as string | undefined;
			const openai = new OpenAI({
				apiKey: apiKey,
			});  

		if (model === "gpt-3.5-turbo" || model === "gpt-4") {
			const response = await openai.chat.completions.create({
				model: model,
				messages: chatGPTPrompt,
				temperature: 1,
				max_tokens: 1000,
				top_p: 1.0,
				frequency_penalty: 1,
				presence_penalty: 1,
			});

			const responseText = response.data.choices[0].message?.content ? response.data.choices[0].message?.content : 'An error occurred. Please try again...';

			if (responseText) {
				const tripleTicks = '```';
				const firstTicksIndex = responseText.indexOf(tripleTicks);
				const lastTicksIndex = responseText.lastIndexOf(tripleTicks);

				if (firstTicksIndex !== -1 && lastTicksIndex !== -1 && firstTicksIndex < lastTicksIndex) {
					const contentBetweenTicks = responseText.substring(firstTicksIndex + tripleTicks.length, lastTicksIndex);

					const editor = await vscode.window.showTextDocument(thread.uri);

					if (!editor) {
						return; // No open text editor
					}

					editor.edit(editBuilder => {
						editBuilder.replace(thread.range, contentBetweenTicks);
					});
				} else {
					vscode.window.showErrorMessage('Unable to find content between triple ticks.');
				}
			} else {
				vscode.window.showErrorMessage('An error occurred. Please try again...');
			}
			} 
	}
	}

