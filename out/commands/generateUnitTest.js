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
        // Ajouter "Test" au nom si nécessaire
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
            // Utiliser le nom du fichier si aucune description n'est fournie
            const finalTestDescription = (testDescription === null || testDescription === void 0 ? void 0 : testDescription.trim()) || fileName.replace("Test", "");
            // Construire le chemin du fichier
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const testFilePath = path.join(workspacePath, "tests", "Unit", `${fileName}.php`);
            // Contenu du fichier
            const template = `<?php

it('${finalTestDescription}', function () {
    expect(true)->toBeTrue();
});
`;
            // Créer le fichier
            fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
            fs.writeFileSync(testFilePath, template);
            // Ouvrir le fichier dans l'éditeur
            vscode.workspace.openTextDocument(testFilePath).then((doc) => {
                vscode.window.showTextDocument(doc);
            });
        });
    });
}
