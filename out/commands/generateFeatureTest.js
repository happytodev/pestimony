"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFeatureTest = generateFeatureTest;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function generateFeatureTest() {
    vscode.window
        .showInputBox({ prompt: "Enter Feature Test Filename" })
        .then((fileName) => {
        if (!fileName)
            return;
        // Add “Test” to the name if necessary
        if (!fileName.endsWith("Test")) {
            fileName += "Test";
        }
        vscode.window
            .showQuickPick(["Yes", "No"], {
            placeHolder: "Include RefreshDatabase trait?",
        })
            .then((includeRefreshDatabase) => {
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
                const testFilePath = path.join(workspacePath, "tests", "Feature", `${fileName}.php`);
                const template = `<?php
${includeRefreshDatabase === "Yes"
                    ? "\nuse Illuminate\\Foundation\\Testing\\RefreshDatabase;\n\nuses(RefreshDatabase::class);\n"
                    : ""}
it('${finalTestDescription}', function () {
    // Arrange
    $response = $this->get('/');

    // Act

    // Assert
    $response->assertStatus(200);
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
    });
}
