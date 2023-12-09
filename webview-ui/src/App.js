import { vscode } from "./utilities/vscode";
import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./App.css";
import { DevXContextProvider, useDevXContext } from './DevXContext';
import React from 'react';
// eslint-disable-next-line no-unused-vars
import Files from "./Files";
import Home from "./Home";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function SplitBlocks(props) {
  const full_text = props.text;
  const flag = full_text[0] === "```" ? 1 : 0;
  const blocks = full_text.split("```");

  // List of supported languages
  const supportedLanguages = [
    "python", "javascript", "java", "c++", "c#", "ruby", "swift", "go", "php",
    "typescript", "kotlin", "rust", "matlab", "r", "bash", "html" , "css", "sql",
    "assembly", "perl", "lua", "objective-c", "scala", "haskell", "lisp", "prolog",
    "fortran", "vb", "dart", "tcl", "groovy","json", "jsx"
  ];

  // Helper function to check if a language is supported
  const isLanguageSupported = (language) => {
    return supportedLanguages.includes(language.toLowerCase());
  };

  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i][0] === "\n") {
      blocks[i] = blocks[i].slice(1);
    }
  }

  const mapped_blocks = blocks.map((block, index) => {
    if (flag === 0) {
      if (index % 2 === 0) {
        return (
          <div key={index}>
            {block.split("\n").map((sentence, i) => (
              <p key={i} className="mb-1">
                {sentence}
              </p>
            ))}
          </div>
        );
      } else {
        const language = block.split("\n")[0].trim(); // Get the second word after splitting by space

        if (isLanguageSupported(language)) {
          // If supported, remove the language from the block
          block = block.replace(language, "").trim();
          return (
            <div key={index}>
               <SyntaxHighlighter className='w-full' language={language} style={vscDarkPlus} customStyle={{ margin: "0px", borderRadius: "2px" }} >
                {block}
                </SyntaxHighlighter>
            </div>
          );
        } else {
          // If not supported, pass the entire block
          return (
            <div key={index} className="pr-2 mb-1">
              <SyntaxHighlighter className='w-full' language={language} style={vscDarkPlus} customStyle={{ margin: "0px", borderRadius: "2px" }} >
                {block}
              </SyntaxHighlighter>
            </div>
          );
        }
      }
    } else {
      if (index % 2 === 0) {
        const language = block.split(" ")[1].trim(); // Get the second word after splitting by space
      if (isLanguageSupported(language)) {
          // If supported, remove the language from the block
          block = block.replace(language, "").trim();
          return (
            <div key={index}>
              <SyntaxHighlighter className='w-fit' language={language} style={vscDarkPlus} customStyle={{ margin: "0px", borderRadius: "2px" }} >
                {block}
              </SyntaxHighlighter>
            </div>
          );
        } else {
          // If not supported, pass the entire block
          return (
            <div key={index}>
              <SyntaxHighlighter className='w-fit ' language={language} style={vscDarkPlus} customStyle={{ margin: "0px", borderRadius: "2px" }} >
                {block}
              </SyntaxHighlighter>
            </div>
          );
        }
      } else {
        return (
          <div key={index}>
            {block.split("\n").map((sentence, i) => (
              <p key={i} className="mb-1">
                {sentence}
              </p>
            ))}
          </div>
        );
      }
    }
  });

  return mapped_blocks;
}


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
      vscode.postMessage({ type: "setMessages", messages: newMessages , files : referencedFiles});
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
          <button className=" ml-auto mb-2 mt-1 mb-2 mr-2 text-white px-2 rounded-sm hover:bg-blue-800 " 
          onClick={() => {
            Promise.all([
              setMessages([]),
              setReferencedFiles([])
            ])
          }}>
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
            <div className="flex rounded-sm flex-row justify-between bg-gradient-to-b from-transparent to-[#4333FD] my-1 ml-10">
              <div className="text-white mx-1 w-full">
                <SplitBlocks text={message.text}/>
              </div>
              
            </div>: 
            <div className="flex rounded-sm flex-row justify-between bg-gradient-to-b from-green-900 to-transparent my-1 mr-10">
              <div className="text-white mx-1 whitespace-pre-line  w-full">
                <SplitBlocks text={message.text}/>
              </div>
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

