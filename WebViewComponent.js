// WebViewComponent.js
import React, { useState, useEffect } from 'react';

function WebViewComponent() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    // Handle messages sent from the extension
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', (event) => {
      const message = event.data.text;
      setMessage(message);
    });

    vscode.postMessage({ text: 'Hello from WebView!' });
  }, []);

  return (
    <div>
      <h1>Hello from React WebView</h1>
      <div id="message">{message}</div>
    </div>
  );
}

export default WebViewComponent;
