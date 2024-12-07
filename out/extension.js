"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const runTests_1 = require("./commands/runTests");
const generateUnitTest_1 = require("./commands/generateUnitTest");
const generateFeatureTest_1 = require("./commands/generateFeatureTest");
function activate(context) {
    console.log("PestPHP Plugin Activated!");
    context.subscriptions.push(vscode.commands.registerCommand("pest.runTests", runTests_1.runTests), vscode.commands.registerCommand("pest.generateFeatureTest", generateFeatureTest_1.generateFeatureTest), vscode.commands.registerCommand("pest.generateUnitTest", generateUnitTest_1.generateUnitTest));
    vscode.window.showInformationMessage("PestPHP Plugin Activated!");
}
function deactivate() { }
