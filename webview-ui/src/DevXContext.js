import { createContext, useContext, useEffect, useState } from 'react';

const DevXContext = createContext(undefined);

export function DevXContextProvider({ children }) {
  const [referencedFiles, setReferencedFiles] = useState([]);

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


  useEffect(() => {
    console.log(referencedFiles);
  }, [referencedFiles]); // Log referencedFiles whenever it changes

  const value = {
    addFile,
    referencedFiles,
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
