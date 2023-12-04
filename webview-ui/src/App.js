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
  const {referencedFiles, messages, setMessages, setReferencedFiles} = useDevXContext();
  const [message, setMessage] = React.useState("");

  const handleMessageSubmit = async (event) => {
    event.preventDefault();
    await setMessages((prevMessages) => {
      const newMessages = [...prevMessages, { id: 'user', text: message }];
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
       {(referencedFiles.length !== 0 || messages.length !== 0) && 
       <div className="flex w-full"> 
          <button className=" ml-auto mb-2 mt-1 mb-2 mr-2 text-white px-2 rounded-sm hover:bg-blue-800 " onClick={() => setMessages([]).then(setReferencedFiles([]))}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
       }
       {referencedFiles.length !== 0 && <Files />}
       {messages.length !== 0 &&
         messages.map((message, index) => (
          <div key={index}> 
            {message.id === 'user' ? 
            <div className="flex rounded-sm flex-row justify-between bg-gradient-to-b from-transparent to-indigo-900 my-1 ml-10">
              <div className="text-white mx-1 ">{message.text}</div>
            </div>: 
            <div className="flex rounded-sm flex-row justify-between bg-gradient-to-b from-green-900 to-transparent my-1 mr-10">
              <div className="text-white mx-1 ">{message.text}</div>
            </div>
            }
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

