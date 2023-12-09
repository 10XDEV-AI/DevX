import * as vscode from 'vscode';
import OpenAI from "openai";
import * as diff from "git-diff";
import {diffLines} from 'diff';

function transformCodeDiff(codeDiff: string): string {
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
        } else if (line.startsWith('-')) {
            if (!inRemovedBlock) {
                result += '=======\n';
                inRemovedBlock = true;
            }
			if (inAddedBlock) {
                result += '=======\n';
                inAddedBlock = false;
            }
            result += line.substring(1) + '\n';
        } else {
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

export function addDiffsToCode2(old_code_block: string, new_code_block: string) : string {
	
	const diffOutput = diffLines(old_code_block, new_code_block, {
		ignoreWhitespace: true
	});
	//console.log(diffOutput);
	let result = '';
	for (const part of diffOutput) {
	if (part.added) {
		const parts = part.value.split('\n');
		for (const parti of parts) {
			result += '+' + parti+'\n';
		}
	} else if (part.removed) {
		const parts = part.value.split('\n');
		for (const parti of parts) {
			result += '-' + parti+'\n';
		}
	} else {
		result += part.value;
	}

	}
	return result;
}


export function addDiffsToCode(old_code_block: string, new_code_block: string) : string {
	
	const options = {
		color: false,      // Add color to the git diff returned?
		flags: '--ignore-all-space --ignore-space-change --ignore-blank-lines --minimal',       // A space separated string of git diff flags from https://git-scm.com/docs/git-diff#_options
		forceFake: false,  // Do not try and get a real git diff, just get me a fake? Faster but may not be 100% accurate
		noHeaders: true,  // Remove the ugly @@ -1,3 +1,3 @@ header?
		save: false,       // Remember the options for next time?5
		wordDiff: false    // Get a word diff instead of a line diff?
	};
	let diffOutput  = diff(old_code_block, new_code_block, options);
	//console.log(old_code_block);
	//console.log(new_code_block);
	console.log(diffOutput);

	if (undefined!== diffOutput) {
		if (diffOutput.includes('\n\\ No newline at end of file')) {
			diffOutput = diffOutput.replaceAll('\n\\ No newline at end of file', '');
		}
		return diffOutput;
	}
    return '';
}

	/**
	 * Gets the highlighted code for this comment thread
	 * @param thread
	 * @returns 
	 */
	async function getCommentThreadCode(thread: vscode.CommentThread) {
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
	export async function aiEdit(reply: vscode.CommentReply) {

		const question = reply.text.trim();
		const thread = reply.thread;
		const model = vscode.workspace.getConfiguration('devxai').get('models') + "";


		const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
		];
		let  codeBlock = await getCommentThreadCode(thread);
		
		
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

		messages.push({"role": "system", "content": "Return fully edited code as per user request delimited by tripple quotes and nothing else."});
		messages.push({"role": "user", "content": "```\n" + codeBlock + "\n```"});	

		const filteredComments = thread.comments.filter(comment => comment.label !== "NOTE");

		for (let i = Math.max(0, filteredComments.length - 8); i < filteredComments.length; i++) {
			if (filteredComments[i].author.name === "VS Code") {
				messages.push({"role": "user", "content": `${(filteredComments[i].body as vscode.MarkdownString).value}`});
			} else if (filteredComments[i].author.name === "DEVX AI") {
				messages.push({"role": "assistant", "content": `${(filteredComments[i].body as vscode.MarkdownString).value}`});
			}
		}
		messages.push({"role": "user", "content": `${question}`});

		const apiKey: string | undefined = vscode.workspace.getConfiguration('devxai').get('ApiKey') as string | undefined;
		const openai = new OpenAI({
			apiKey: apiKey,
		});

		if (model === "gpt-3.5-turbo" || model === "gpt-4") {
			const response = await openai.chat.completions.create({
				messages: messages,
				model: "gpt-3.5-turbo",
				max_tokens:1000,
			});

			const responseText = response.choices[0].message?.content ? response.choices[0].message?.content : 'An error occured. Please try again...';
			//const responseText = 'Some lines of \ code```';
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
					else{
						const languages = [
							"python",
							"java",
							"javascript",
							"js",
							"ts",
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
						if (contentBetweenTicks.startsWith('\n') && contentBetweenTicks.endsWith('\n')){
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
					const diffs: string = addDiffsToCode2(codeBlockWithCommonIndent, contentBetweenTicks);

					if (!editor) {
						return;
					}

					editor.edit(editBuilder => {
						editBuilder.replace(new vscode.Range(new vscode.Position(thread.range.start.line,0), thread.range.end), diffs);
					});
					
					//calculate the new range in which the diff string is placed

					const newRange = new vscode.Range(new vscode.Position(thread.range.start.line,0), new vscode.Position(thread.range.start.line + diffs.split('\n').length,0));

				} else {
					const editor = await vscode.window.showTextDocument(thread.uri);
					
					if (!editor) {
						return;
					}

					const diffs: string = addDiffsToCode2(codeBlockWithCommonIndent, responseText);
					editor.edit(editBuilder => {
						editBuilder.replace(new vscode.Range(new vscode.Position(thread.range.start.line,0), thread.range.end), diffs);
					});

					//calculate the new range in which the diff string is placed
					const newRange = new vscode.Range(new vscode.Position(thread.range.start.line,0), new vscode.Position(thread.range.start.line + diffs.split('\n').length+1,0));
				}
			} else {
				vscode.window.showErrorMessage('An error occurred. Please try again...');
			}
		}
	}

function findCommonIndent(codeBlock: string): string {
	const lines = codeBlock.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
	if (lines.length === 0) {
		return ''; // No lines, so no indent
	}

	const indents = lines.map(line => line.match(/^\s*/)?.[0] ?? ''); // Extract indents
	const smallestIndent = indents.reduce((smallest, current) => (current.length < smallest.length ? current : smallest), indents[0]);

	return smallestIndent;
}	