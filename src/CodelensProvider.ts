import * as vscode from 'vscode';

/**
 * CodelensProvider
 */

export class CodelensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;
	private isCodeLensEnabled = true;

	public toggleCodeLens() {
		this.isCodeLensEnabled = !this.isCodeLensEnabled;
		this._onDidChangeCodeLenses.fire();
	}

    public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
		if (!this.isCodeLensEnabled) {
			return []; // Return an empty array when CodeLens is deactivated.
		}

		const codeLenses: vscode.CodeLens[] = [];
	
		let startLineIndex = -1;
	
		for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
			const line = document.lineAt(lineIndex);
			const lineText = line.text.trim();
	
			if (lineText.startsWith('+') || lineText.startsWith('-')) {
				if (startLineIndex === -1) {
					// Start of a new group
					startLineIndex = lineIndex;
				}
			} else if (startLineIndex !== -1) {
				// End of the group
				const endLineIndex = lineIndex - 1;
				const range = new vscode.Range(startLineIndex, 0, endLineIndex, document.lineAt(endLineIndex).text.length);
	
				const command1: vscode.Command = {
					command: 'mywiki.Accept',
					title: 'Accept',
					arguments: [document.uri, range]
				};
	
				const codeLens1 = new vscode.CodeLens(range, command1);

				codeLenses.push(codeLens1);
				const command2: vscode.Command = {
					command: 'mywiki.Reject',
					title: 'Reject',
					arguments: [document.uri, range]
				};
	
				const codeLens2 = new vscode.CodeLens(range, command2);
				codeLenses.push(codeLens2);

				const command3: vscode.Command = {
					command: 'mywiki.Merge',
					title: 'Merge',
					arguments: [document.uri, range]
				};
	
				const codeLens3 = new vscode.CodeLens(range, command3);
				codeLenses.push(codeLens3);
	
				// Reset for the next group
				startLineIndex = -1;
			}
		}
	
		// Check if there's a group at the end of the document
		if (startLineIndex !== -1) {
			const endLineIndex = document.lineCount - 1;
			const range = new vscode.Range(startLineIndex, 0, endLineIndex, document.lineAt(endLineIndex).text.length);
			
			const command1: vscode.Command = {
				command: 'mywiki.Accept',
				title: 'Accept',
				arguments: [document.uri, range]
			};

			const codeLens1 = new vscode.CodeLens(range, command1);

			codeLenses.push(codeLens1);
			const command2: vscode.Command = {
				command: 'mywiki.Reject',
				title: 'Reject',
				arguments: [document.uri, range]
			};

			const codeLens2 = new vscode.CodeLens(range, command2);
			codeLenses.push(codeLens2);

			const command3: vscode.Command = {
				command: 'mywiki.Merge',
				title: 'Merge',
				arguments: [document.uri, range]
			};

			const codeLens3 = new vscode.CodeLens(range, command3);
			codeLenses.push(codeLens3);
		}
	
		return codeLenses;
	}
	

	public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
		if (vscode.workspace.getConfiguration("codelens-sample").get("enableCodeLens", true)) {
			return codeLens;
		}
		return null;
	}
}