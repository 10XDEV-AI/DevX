const vscode = require('vscode');
import { renderToString } from 'react-dom/server';

// This method is called when your extension is activated
function activate(context) {
  console.log('Congratulations, your extension "devx" is now active!');

  let disposable = vscode.commands.registerCommand('devx.helloWorld', function () {
    // Create and show a WebView
    const panel = vscode.window.createWebviewPanel(
      'devxWebView', // Identifies the webview
      'DevX WebView', // Title of the panel
      vscode.ViewColumn.One, // Editor column to show the webview in
      {}
    );

    // Set the HTML content for the webview
    panel.webview.html = getWebViewContent();

    // Handle disposal of the webview panel when the command is done
    panel.onDidDispose(() => {
      // Clean up resources here
    });

    // You can send messages to the webview and handle them in your HTML/JavaScript code
    panel.webview.postMessage({ text: 'Hello from the extension!' });
  });

  context.subscriptions.push(disposable);
}

function getWebViewContent() {
  const componentString = renderToString(<ReactComponent />);

  // Define the HTML content for the WebView
  return `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <h1>Hello from WebView</h1>
      <div id="message"></div>
	  <div id="root">${componentString}</div>

      <script>
        // Handle messages sent from the extension
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ text: 'Hello from WebView!' });

        window.addEventListener('message', (event) => {
          const message = event.data;
          document.getElementById('message').textContent = message.text;
        });
      </script>
    </body>
    </html>
  `;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
