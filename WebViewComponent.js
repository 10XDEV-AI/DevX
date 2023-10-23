// WebViewComponent.js
import { useState, useEffect } from 'react';

function WebViewComponent() {
  const [message, setMessage] = useState('Loading...');


  return (
    <div>
      <h1>Hello from React WebView</h1>
      <div id="message">{message}</div>
    </div>
  );
}

export default WebViewComponent;
