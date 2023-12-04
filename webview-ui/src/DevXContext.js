import { createContext, useContext, useEffect, useState } from 'react';
const DevXContext = createContext(undefined);

export function DevXContextProvider({ children }) {
  const [referencedFiles, setReferencedFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addFile = async (filePath, fileContents) => {
    setReferencedFiles((prevFiles) => ({
      ...prevFiles,
      [filePath]: { path: filePath, contents: fileContents },
    }));
    console.log(`Adding file: ${filePath}, Contents: ${fileContents}`);
  };

  const handleMessage = (event) => {
    const message = event.data;

    switch (message.type) {
      case 'addFile':
        addFile(message.filePath, message.fileContents);
        break;

        case 'updateGPTResponse':
         const lastIndex = messages.length - 1;
         console.log(message.response);
         console.log(lastIndex);
         if (messages[lastIndex].id === 'user') {
           const updatedMessages = [...messages, { id: 'assistant', text: message.response }];
           setMessages(updatedMessages);
         } else if (messages[lastIndex].id === 'assistant') {
           const updatedMessages = [...messages];
           updatedMessages[lastIndex].text = message.response;
           setMessages(updatedMessages);
         }      

         setIsLoading(false);
         break;


      default:
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  });


  const value = {
    addFile,
    referencedFiles,
    setReferencedFiles,
    messages,
    isLoading,
    setMessages
  };

  return <DevXContext.Provider value={value}>{children}</DevXContext.Provider>;
}

export function useDevXContext() {
  const context = useContext(DevXContext);
  if (!context) {
    throw new Error('useDevXContext must be used within a DevXContextProvider');
  }
  return context;
}
