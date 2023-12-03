import { vscode } from "./utilities/vscode";
import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import { DevXContextProvider, useDevXContext } from './DevXContext';
import React from 'react';
// eslint-disable-next-line no-unused-vars
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
  const {referencedFiles, messages, setMessages} = useDevXContext();
  const [message, setMessage] = React.useState("");

  const handleMessageSubmit = async (event) => {
    event.preventDefault();
    await setMessages((prevMessages) => {
      const newMessages = [...prevMessages, { id: 'user', message: message }];
      setMessage("");
      vscode.postMessage({ type: "setMessages", messages: newMessages });
      return newMessages; 
    });
  };
  
  const handleInputChange = (event) => {
    setMessage(event.target.value);
  };

  return (
     <div className="flex flex-col h-screen">
       {referencedFiles.length === 0 && messages.length === 0 && <Home />}
       {referencedFiles.length !== 0 && <Files />}
       {messages.length !== 0 &&
         messages.map((message, index) => (
          <div key={index} className="flex rounded-sm flex-row justify-between bg-gradient-to-r from-indigo-800 from-10% via-sky-500 via-40% to-blue-900 to-90% my-1 ml-10">
            {message.id === 'user' ? <div className="text-white mx-1 ">{message.message}</div>: <div className="text-white mx-1 ">{message}</div>}
           </div>
         ))}
       <div className="mt-auto w-full">
         <form onSubmit={handleMessageSubmit} className="flex">
          <VSCodeTextArea className="px-2 mt-1 w-full text-xl" placeholder="Ask AI" value={message} onChange={handleInputChange}/>
          <button type="submit" className="bg-blue-500 mt-1 mb-2 mr-2 text-white px-2 rounded-sm hover:bg-blue-800 ">Submit</button>
         </form>
       </div>
     </div>
   );
};


 export default App;

