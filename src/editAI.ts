import * as vscode from 'vscode';
import OpenAI from "openai";


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
	 * AI will edit the highlighted code based on the given instructions.
	 * Uses the OpenAI Edits endpoint. Replaces the highlighted code
	 * with AI generated code. You can undo to go back.
	 * 
	 * @param reply 
	 * @returns 
	 */
	export async function aiEdit(reply: vscode.CommentReply) {
			
		const question = reply.text.trim();
		const thread = reply.thread;
		const model = vscode.workspace.getConfiguration('devxai').get('models') + "";
		
		// let chatGPTPrompt = [];
		// chatGPTPrompt = await generatePromptChatGPTEdit(question, thread);
		const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
		];

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

		const apiKey: string | undefined = vscode.workspace.getConfiguration('devxai').get('ApiKey') as string | undefined;
			const openai = new OpenAI({
				apiKey: apiKey,
			});  

		if (model === "gpt-3.5-turbo" || model === "gpt-4") {
			const response = await openai.chat.completions.create({
				messages: messages,
				model: "gpt-3.5-turbo",
			});

		const responseText = response.choices[0].message?.content ? response.choices[0].message?.content : 'An error occured. Please try again...';
			
		if (responseText) {
			const tripleTicks = '```';
			const firstTicksIndex = responseText.indexOf(tripleTicks);
			const lastTicksIndex = responseText.lastIndexOf(tripleTicks);
			if (firstTicksIndex !== -1 && lastTicksIndex !== -1 && firstTicksIndex < lastTicksIndex) {
				let contentBetweenTicks = responseText.substring(firstTicksIndex + tripleTicks.length, lastTicksIndex);
				if (! contentBetweenTicks.startsWith('\n')){
						const firstslashn = contentBetweenTicks.indexOf('\n');
						//return code after slash n
						contentBetweenTicks = contentBetweenTicks.substring(firstslashn);

				}
				const editor = await vscode.window.showTextDocument(thread.uri);

				if (!editor) {
					return;
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