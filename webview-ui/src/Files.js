import React from 'react';
import { useDevXContext } from './DevXContext'; // Replace with the actual import for your DevX context library
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const Files = () => {
   const { referencedFiles, setReferencedFiles } = useDevXContext();
   
  const handleFileCancelClick = (filePath) => {
    setReferencedFiles((prevFiles) => {
      const updatedFiles = { ...prevFiles };
      delete updatedFiles[filePath];
      return updatedFiles;
    });};

  return (
    <div className=''>
      <div className='text-xl font-bold m-1'> Files </div>
      {Object.values(referencedFiles).map((file, index) => (
        <span key={index}>
            <div className="flex mt-2">
                <div className='ml-2'>
                {file.path.split('/').pop()}
                </div>
                <div className='ml-auto space-x-1 mr-2'>
                    {/* <button className='bg-blue-500 text-sm text-white  px-2 rounded-sm hover:bg-blue-800 '>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                    </svg>
                    </button>
                    <button className='bg-blue-500 text-sm text-white px-2 rounded-sm hover:bg-blue-800'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                    </button> */}
                    <button className='text-sm text-white px-2 rounded-sm hover:bg-blue-800' onClick={() => handleFileCancelClick(file.path)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    </button>
                </div>
            </div>
            <div className="max-w-screen max-h-32 overflow-scroll mx-1">
                <SyntaxHighlighter className='' language="jsx" style={vscDarkPlus} customStyle={{ margin: "0px", borderRadius: "2px" }} >
                {file.contents}
                </SyntaxHighlighter>
            </div>
        </span>
      ))}
    </div>
  );
};

export default Files;
