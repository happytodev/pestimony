"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
const vscode = require("vscode");
function runTests() {
    // Ask the user to choose the scope of testing
    vscode.window
        .showQuickPick(['Run All Tests', 'Run Suite', 'Run Single Test'], {
        placeHolder: 'Select the scope of tests to run',
        canPickMany: false,
    })
        .then((selection) => {
        if (!selection) {
            vscode.window.showInformationMessage('No option selected.');
            return; // Stop if no selection is made
        }
        // Determine the command to be executed
        let command = '';
        switch (selection) {
            case 'Run All Tests':
                command = './vendor/bin/pest';
                break;
            case 'Run Suite':
                return vscode.window
                    .showInputBox({ prompt: 'Enter Suite Name' })
                    .then((suite) => {
                    if (suite) {
                        command = `./vendor/bin/pest --filter=${suite}`;
                        runTerminalCommand(command); // Start the terminal with the command
                    }
                    else {
                        vscode.window.showInformationMessage('No suite name entered.');
                    }
                });
            case 'Run Single Test':
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const filePath = editor.document.uri.fsPath;
                    command = `./vendor/bin/pest ${filePath}`;
                }
                else {
                    vscode.window.showErrorMessage('No active editor found. Open a test file to run.');
                }
                break;
            default:
                vscode.window.showErrorMessage('Invalid selection.');
        }
        // Start the terminal with the command, if defined
        if (command) {
            runTerminalCommand(command);
        }
    });
}
// Utility function to execute a command in the terminal
function runTerminalCommand(command) {
    const terminal = vscode.window.createTerminal('Pest Tests');
    terminal.show();
    terminal.sendText(command);
}
