"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTest = generateTest;
const vscode = require("vscode");
function generateTest() {
    vscode.window.showInputBox({ prompt: 'Enter Test Name' }).then(testName => {
        if (!testName)
            return;
        vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: 'Include Refresh Database?' }).then(refreshDb => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const template = `
<?php

use Illuminate\\Foundation\\Testing\\RefreshDatabase;
use Tests\\TestCase;

${refreshDb === 'Yes' ? 'use RefreshDatabase;' : ''}

test('${testName}', function () {
    // Arrange

    // Act

    // Assert
});
`;
                editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, template);
                });
            }
        });
    });
}
