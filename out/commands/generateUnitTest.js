"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUnitTest = generateUnitTest;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function generateUnitTest() {
    vscode.window
        .showInputBox({ prompt: "Enter Unit Test Filename" })
        .then((fileName) => {
        if (!fileName)
            return;
        // Add “Test” to the name if necessary
        if (!fileName.endsWith("Test")) {
            fileName += "Test";
        }
        vscode.window
            .showInputBox({ prompt: "Enter Test Description (optional)" })
            .then((testDescription) => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage("No workspace folder is open.");
                return;
            }
            // Use file name if no description is provided
            const finalTestDescription = (testDescription === null || testDescription === void 0 ? void 0 : testDescription.trim()) || fileName.replace("Test", "");
            // Build file path
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const testFilePath = path.join(workspacePath, "tests", "Unit", `${fileName}.php`);
            // File contents
            const template = `<?php

it('${finalTestDescription}', function () {
    expect(true)->toBeTrue();
});
`;
            // Create file
            fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
            fs.writeFileSync(testFilePath, template);
            // Open file in editor
            vscode.workspace.openTextDocument(testFilePath).then((doc) => {
                vscode.window.showTextDocument(doc);
            });
        });
    });
}
