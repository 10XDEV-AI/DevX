import React, { createContext, useContext, ReactNode, useState } from 'react';
import { useEffect } from 'react';


interface DevXContextProps {
  children: ReactNode;
}

interface DevXContextValue {
  addFile: (filePath: string, fileContents: string) => void;
  referencedFiles: Record<string, { path: string; contents: string }>;
}



const DevXContext = createContext<DevXContextValue | undefined>(undefined);


export function DevXContextProvider({ children }: DevXContextProps) {

  const [referencedFiles, setReferencedFiles] = useState<Record<string, { path: string; contents: string }>>({});

  const addFile = async (filePath: string, fileContents: string) => {
    setReferencedFiles((prevFiles) => ({
      ...prevFiles,
      [filePath]: { path: filePath, contents: fileContents },
    }));
    console.log(`Adding file: ${filePath}, Contents: ${fileContents}`);
    console.log(referencedFiles);
  };

  const handleMessage = (event: MessageEvent) => {
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
