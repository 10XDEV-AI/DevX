//import { vscode } from "./utilities/vscode";
import { VSCodeTextArea } from "@vscode/webview-ui-toolkit/react";
import "./App.css";

function App() {
//   function handleHowdyClick() {
//     vscode.postMessage({
//       command: "hello",
//       text: "Hey there partner! 🤠",
//     });
//   }


  return (
    <main className="flex h-screen flex-col items-center justify-center">
    <div className="flex flex-col items-center my-auto">
      <div>
        <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 8.36364C0 3.74453 3.76466 0 8.4086 0H59.5914C64.2353 0 68 3.74453 68 8.36364V59.6364C68 64.2555 64.2353 68 59.5914 68H8.4086C3.76466 68 0 64.2555 0 59.6364V8.36364Z" fill="#D9D9D9"/>
          <path d="M1.82796 9.09091C1.82796 5.07429 5.10157 1.81818 9.13978 1.81818H59.2258C63.264 1.81818 66.5376 5.07429 66.5376 9.09091V58.9091C66.5376 62.9257 63.264 66.1818 59.2258 66.1818H9.13979C5.10158 66.1818 1.82796 62.9257 1.82796 58.9091V9.09091Z" fill="#000101"/>
          <path d="M3.65591 8.77334C3.65591 5.94379 5.97565 3.65715 8.8203 3.68264L59.5008 4.13678C62.2912 4.16178 64.5473 6.40552 64.5727 9.18106L65.0282 58.8627C65.0541 61.6923 62.7551 64 59.9101 64H8.77419C5.94744 64 3.65591 61.7207 3.65591 58.9091V8.77334Z" fill="#1E1E1E"/>
          <path d="M33.435 35.0083L12.0313 45.8512L11.4794 41.2231L27.8978 33.3554L28.3167 34.0165V33.3554L28.4497 33.6198L12.0313 25.7521V21.5207L33.435 32.3636V35.0083Z" fill="white"/>
          <path d="M35.0635 35.0083V32.3636L56.4673 21.5207V25.7521L40.0489 33.6198L40.1818 33.3554V34.0165L40.0489 33.7521L56.4673 41.6198V45.8512L35.0635 35.0083Z" fill="white"/>
          
        </svg>
      </div>
      <div className="text-xl mt-4">
        Add your files to DevX to edit or chat
      </div>
    </div>
    <div className="mt-auto mx-auto w-full">
      <VSCodeTextArea className="w-full p-3 text-xl" placeholder="Ask AI"/>
    </div>
    </main>


  );
  
}

export default App;
