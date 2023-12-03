"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
// import * as myExtension from '../extension';
// suite('Extension Test Suite', () => {
//   after(() => {
//     vscode.window.showInformationMessage('All tests done!');
//   });
//   test('Sample test', () => {
//     assert.strictEqual(-1, [1, 2, 3].indexOf(5));
//     assert.strictEqual(-1, [1, 2, 3].indexOf(0));
//   });
// });
const editAI_1 = require("../utilities/editAI");
suite('addDiffsToCode Function Tests', () => {
    test('Should return the correct diff output', () => {
        const oldCodeBlock = 'console.log("Hello, World!");';
        const newCodeBlock = 'console.log("Hello, ChatGPT!");';
        const expectedDiffOutput = `-console.log("Hello, World!");\n+console.log("Hello, ChatGPT!");\n`;
        const actualDiffOutput = (0, editAI_1.addDiffsToCode)(oldCodeBlock, newCodeBlock);
        assert.deepStrictEqual(actualDiffOutput, expectedDiffOutput);
    });
    test('Should return the correct diff output and ignore space changes', () => {
        const oldCodeBlock = 'light: {\n// this color will be used in light color themes\nborderColor: darkpink\n},\ndark:{\n// this color will be used in dark color themes\nborderColor: lightpink\n}';
        const newCodeBlock = 'light: {\n  //   this color will be used in light color themes\nborderColor: darkpink\n},\ndark:{\n// this color will be used in dark color themes\nborderColor: lightpink\n}';
        //const expectedDiffOutput =  ` light: {\n // this color will be used in light color themes\n-borderColor: darkpink\n+borderColor: darkblue\n },\n dark:{\n // this color will be used in dark color themes\n borderColor: lightpink\n }\n`; 
        const expectedDiffOutput = ``;
        const actualDiffOutput = (0, editAI_1.addDiffsToCode)(oldCodeBlock, newCodeBlock);
        assert.deepStrictEqual(actualDiffOutput, expectedDiffOutput);
    });
    // test('Should handle empty code blocks', () => {
    //   const oldCodeBlock = '';
    //   const newCodeBlock = '';
    //   const expectedDiffOutput : DiffObject[] = [];
    //   const actualDiffOutput = addDiffsToCode(oldCodeBlock, newCodeBlock);
    //   assert.deepStrictEqual(actualDiffOutput, expectedDiffOutput);
    // });
    // test('Should handle identical code blocks', () => {
    //   const codeBlock = 'console.log("Hello, World!");';
    //   const expectedDiffOutput = [{ value: 'console.log("Hello, World!");' }];
    //   const actualDiffOutput = addDiffsToCode(codeBlock, codeBlock);
    //   assert.deepStrictEqual(actualDiffOutput, expectedDiffOutput);
    // });
});
// import { aiEdit } from '../../editAI';
// import { askAI } from '../../askAI';
// suite('Extension Test Suite', () => {
//   // Test case for aiEdit function
//   test('aiEdit function should replace the highlighted code with AI generated code', async () => {
//     // Create a mock comment thread and reply
//     const thread : vscode.CommentThread = {
//       uri: vscode.Uri.file('src/test/suite/extension.test.ts'),
//       range: new vscode.Range(new vscode.Position(2, 0), new vscode.Position(10, 0)),
//       comments: [],
//     };
//     const reply: vscode.CommentReply = {
//       text: 'Write a test case for the aiEdit function',
//       thread: thread,
//     };
//     // Call the aiEdit function
//     await aiEdit(reply);
//     // Assert that the highlighted code has been replaced
//     // with AI generated code in the comment thread
//     const updatedCodeBlock: string = await getCommentThreadCode(thread);
//     assert.strictEqual(updatedCodeBlock, '/* AI generated code */');
//   });
//   // Test case for askAI function
//   test('askAI function should add the user question and AI response to the comment thread', async () => {
//     // Create a mock comment thread and reply
//     const thread: vscode.CommentThread = {
//       uri: vscode.Uri.file('src/test/suite/extension.test.ts'),
//       range: new vscode.Range(new vscode.Position(12, 0), new vscode.Position(20, 0)),
//       comments: [],
//     };
//     const reply: vscode.CommentReply = {
//       text: 'How can I improve the aiEdit function?',
//       thread: thread,
//     };
//     // Call the askAI function
//     await askAI(reply);
//     // Assert that the user question and AI response have been added
//     // to the comment thread
//     const comments: vscode.Comment[] = thread.comments;
//     assert.strictEqual(comments.length, 2);
//     assert.strictEqual(comments[0].author.name, 'VS Code');
//     assert.strictEqual(comments[0].body.value, 'How can I improve the aiEdit function?');
//     assert.strictEqual(comments[1].author.name, 'DEVX AI');
//     assert.strictEqual(comments[1].body.value, '/* AI generated response */');
//   });
// });
//# sourceMappingURL=suite.extension.test.js.map