import * as assert from 'assert';
import { after} from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../extension';

suite('Extension Test Suite', () => {
  after(() => {
    vscode.window.showInformationMessage('All tests done!');
  });

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
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