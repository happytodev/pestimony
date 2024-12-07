"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const runTests_1 = require("./commands/runTests");
const generateUnitTest_1 = require("./commands/generateUnitTest");
const generateFeatureTest_1 = require("./commands/generateFeatureTest");
const codelensProvider_1 = require("./codelensProvider");
function activate(context) {
    // Add CodeLensProvider
    const codeLensProvider = new codelensProvider_1.TestCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: "php" }, codeLensProvider));
    // Refresh CodeLens for all files open at startup
    vscode.workspace.textDocuments.forEach((document) => {
        if (document.languageId === "php" && document.fileName.includes("Test")) {
            console.log(`Refreshing CodeLens for document: ${document.fileName}`);
            codeLensProvider.refresh();
        }
    });
    // Refresh CodeLens when opening a PHP file only if it has Test in its name
    vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === "php" && document.fileName.includes("Test")) {
            console.log(`Document opened: ${document.fileName}`);
            codeLensProvider.refresh();
        }
    });
    // Refresh CodeLens on change of active editor and only for tests files
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.languageId === "php" && editor.document.fileName.includes("Test")) {
            console.log(`Active editor changed to: ${editor.document.fileName}`);
            codeLensProvider.refresh();
        }
    });
    // Register main commands
    context.subscriptions.push(vscode.commands.registerCommand("pest.runTests", runTests_1.runTests), vscode.commands.registerCommand("pest.generateFeatureTest", generateFeatureTest_1.generateFeatureTest), vscode.commands.registerCommand("pest.generateUnitTest", generateUnitTest_1.generateUnitTest), 
    // Command to run a single test
    vscode.commands.registerCommand("pest.runSingleTest", (filePath, testName) => __awaiter(this, void 0, void 0, function* () {
        const command = `./vendor/bin/pest ${filePath} --filter="${testName}"`;
        const success = yield executeCommand(command);
        logTestResult(`Test "${testName}" in file "${filePath}"
${success ? "✅ Passed" : "❌ Failed"}`);
        (0, codelensProvider_1.updateTestResult)(filePath, testName, success);
        codeLensProvider.refresh();
    })), 
    // Command to run all tests on a file
    vscode.commands.registerCommand("pest.runAllTests", (filePath) => __awaiter(this, void 0, void 0, function* () {
        const command = `./vendor/bin/pest ${filePath}`;
        const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
        if (document) {
            const regex = /\b(it|test)\(['"](.+?)['"],/g;
            const text = document.getText();
            let match;
            const results = {};
            // Run each test individually and store the results
            while ((match = regex.exec(text)) !== null) {
                const testName = match[2];
                const testCommand = `./vendor/bin/pest ${filePath} --filter="${testName}"`;
                const success = yield executeCommand(testCommand);
                results[testName] = success;
                (0, codelensProvider_1.updateTestResult)(filePath, testName, success);
            }
            // Display global results in the console
            logTestResult(`All tests in file "${filePath}" executed.
Results: ${JSON.stringify(results, null, 2)}`);
        }
        codeLensProvider.refresh();
    })), 
    // Command to refresh CodeLens
    vscode.commands.registerCommand("pest.refreshCodeLens", () => {
        console.log("Manual refresh triggered");
        codeLensProvider.refresh();
    }));
    // Add an output channel for test results
    const testOutputChannel = vscode.window.createOutputChannel("Pest Test Results");
    context.subscriptions.push(testOutputChannel);
    function logTestResult(message) {
        testOutputChannel.appendLine(message);
        testOutputChannel.show(true);
    }
    vscode.window.showInformationMessage("PestPHP Plugin Activated!");
}
function deactivate() { }
// Utility function to execute a command and return a result
function executeCommand(command) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const taskDefinition = {
                type: "shell",
            };
            const task = new vscode.Task(taskDefinition, vscode.TaskScope.Workspace, "Pest Tests", "pest", new vscode.ShellExecution(command));
            const outputChannel = vscode.window.createOutputChannel("Pest Test Results");
            // Listener to capture task output
            const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
                if (e.execution.task.name === "Pest Tests") {
                    const exitCode = e.exitCode;
                    if (exitCode === 0) {
                        outputChannel.appendLine("✅ Tests passed successfully");
                        resolve(true);
                    }
                    else {
                        outputChannel.appendLine("❌ Tests failed");
                        resolve(false);
                    }
                    disposable.dispose(); // Clean the listener
                }
            });
            // Display outputs in the channel
            outputChannel.show(true);
            vscode.tasks.executeTask(task).then(() => {
                outputChannel.appendLine(`Running: ${command}`);
            }, (err) => {
                outputChannel.appendLine(`Error running task: ${err}`);
                reject(err);
            });
        });
    });
}
