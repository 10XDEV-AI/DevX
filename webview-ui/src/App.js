// import { vscode } from "./utilities/vscode";
import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import { DevXContextProvider, useDevXContext } from './DevXContext';
import React from 'react';
import Test  from './Test';
import Files from "./Files";
import Home from "./Home";

const App = () => {
  return (
    <div className="App">
    <div id="alert-container"></div>
    <DevXContextProvider>
      <Chat/>
    </DevXContextProvider>
    </div>
  );
};

const Chat = () => {
  const {referencedFiles} = useDevXContext();
  const [message, setMessage] = React.useState("");
  const handleMessageSubmit = (event) => {
    event.preventDefault();
    console.log("Message:", message);
    setMessage("");
  };

  const handleInputChange = (event) => {
    setMessage(event.target.value);
  };

  return (
  <div className="flex flex-col h-screen">
    {referencedFiles.length===0? <Home/> : <Files/>}
    <div className="mt-auto w-full">
      <form onSubmit={handleMessageSubmit}>
      <VSCodeTextArea className="px-2 w-full text-xl" placeholder="Ask AI" value={message} onChange={handleInputChange}/>
      </form>
    </div>
    </div>
    );

  };

export default App;
