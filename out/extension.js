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
const generateUnitTest_1 = require("./commands/generateUnitTest");
const generateFeatureTest_1 = require("./commands/generateFeatureTest");
const codelensProvider_1 = require("./codelensProvider");
const fs = require("fs");
const path = require("path");
// Map to store the latest test results
const testResults = new Map();
function activate(context) {
    console.log("PestPHP Plugin Activated!");
    // Add the CodeLensProvider
    const codeLensProvider = new codelensProvider_1.TestCodeLensProvider();
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: "php" }, codeLensProvider));
    // Refresh CodeLens for all open php files at startup with Test in their name
    vscode.workspace.textDocuments.forEach((document) => {
        if (document.languageId === "php" && document.fileName.includes("Test")) {
            console.log(`Refreshing CodeLens for document: ${document.fileName}`);
            updateTestResultsInDocument(document);
            codeLensProvider.refresh();
        }
    });
    // Refresh CodeLens when opening a PHP file
    vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === "php" && document.fileName.includes("Test")) {
            console.log(`Document opened: ${document.fileName}`);
            updateTestResultsInDocument(document);
            codeLensProvider.refresh();
        }
    });
    // Refresh CodeLens when active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor &&
            editor.document.languageId === "php" &&
            editor.document.fileName.includes("Test")) {
            console.log(`Active editor changed to: ${editor.document.fileName}`);
            updateTestResultsInDocument(editor.document);
            codeLensProvider.refresh();
        }
    });
    // Register main commands
    context.subscriptions.push(vscode.commands.registerCommand("pest.runTests", () => __awaiter(this, void 0, void 0, function* () {
        const scope = yield vscode.window.showQuickPick([
            "Run All Tests",
            "Run Suite",
            "Run Single Test",
        ], {
            placeHolder: "Select the scope of the tests to run",
        });
        if (!scope) {
            vscode.window.showInformationMessage("No scope selected.");
            return;
        }
        // Ensure required test directories exist
        ensureTestDirectoriesExist();
        if (scope === "Run All Tests") {
            const command = `./vendor/bin/pest`;
            yield executeCommandAndUpdateResults(command);
            codeLensProvider.refresh();
        }
        else if (scope === "Run Suite") {
            const suite = yield vscode.window.showInputBox({
                prompt: "Enter the suite name",
            });
            if (suite) {
                const command = `./vendor/bin/pest --filter=${suite}`;
                yield executeCommandAndUpdateResults(command);
                codeLensProvider.refresh();
            }
        }
        else if (scope === "Run Single Test") {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const filePath = editor.document.uri.fsPath;
                const command = `./vendor/bin/pest ${filePath}`;
                yield executeCommandAndUpdateResults(command);
                codeLensProvider.refresh();
            }
            else {
                vscode.window.showErrorMessage("No active editor with a test file.");
            }
        }
    })), vscode.commands.registerCommand("pest.generateFeatureTest", generateFeatureTest_1.generateFeatureTest), vscode.commands.registerCommand("pest.generateUnitTest", generateUnitTest_1.generateUnitTest), 
    // Command to run a single test
    vscode.commands.registerCommand("pest.runSingleTest", (filePath, testName) => __awaiter(this, void 0, void 0, function* () {
        const command = `./vendor/bin/pest ${filePath} --filter=\"${testName}\"`;
        const success = yield executeCommandAndUpdateResults(command, filePath);
        logTestResult(`Test "${testName}" in file "${filePath}"
${success ? "✅ Passed" : "❌ Failed"}`);
        (0, codelensProvider_1.updateTestResult)(filePath, testName, success);
        codeLensProvider.refresh();
    })), 
    // Command to run all tests in a file
    vscode.commands.registerCommand("pest.runAllTests", (filePath) => __awaiter(this, void 0, void 0, function* () {
        ensureTestDirectoriesExist();
        const command = `./vendor/bin/pest ${filePath}`;
        const document = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === filePath);
        if (document) {
            const regex = /\b(it|test)\(['"](.+?)['"],/g;
            const text = document.getText();
            let match;
            const results = {};
            // Execute each test individually and store results
            while ((match = regex.exec(text)) !== null) {
                const testName = match[2];
                const testCommand = `./vendor/bin/pest ${filePath} --filter=\"${testName}\"`;
                const success = yield executeCommandAndUpdateResults(testCommand, filePath);
                results[testName] = success;
                (0, codelensProvider_1.updateTestResult)(filePath, testName, success);
            }
            // Store results in the global map
            if (!testResults.has(filePath)) {
                testResults.set(filePath, new Map());
            }
            const fileResults = testResults.get(filePath);
            for (const [testName, success] of Object.entries(results)) {
                fileResults.set(testName, success);
            }
            console.log('filetestResults >>>');
            console.log(fileResults);
            console.log('<<< End testResults');
            // Display global results in the console
            logTestResult(`All tests in file "${filePath}" executed.
Results: ${JSON.stringify(results, null, 2)}`);
        }
        codeLensProvider.refresh();
    })), 
    // Command to run only failed tests
    vscode.commands.registerCommand("pest.runFailedTests", (filePath) => __awaiter(this, void 0, void 0, function* () {
        const failedTests = (0, codelensProvider_1.getFailedTests)(filePath);
        if (!failedTests.length) {
            vscode.window.showInformationMessage("No failed tests to rerun.");
            return;
        }
        const results = {};
        for (const testName of failedTests) {
            const command = `./vendor/bin/pest ${filePath} --filter=\"${testName}\"`;
            const success = yield executeCommandAndUpdateResults(command, filePath);
            results[testName] = success;
            (0, codelensProvider_1.updateTestResult)(filePath, testName, success);
        }
        // Store results in the global map
        if (!testResults.has(filePath)) {
            testResults.set(filePath, new Map());
        }
        const fileResults = testResults.get(filePath);
        for (const [testName, success] of Object.entries(results)) {
            fileResults.set(testName, success);
        }
        logTestResult(`Rerun failed tests in file "${filePath}" completed.
Results: ${JSON.stringify(results, null, 2)}`);
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
    // Ensure required directories exist
    function ensureTestDirectoriesExist() {
        ensureDirectoryExists("tests/Unit");
        ensureDirectoryExists("tests/Feature");
    }
    // Ensure the directory exists, and if not, create it
    function ensureDirectoryExists(directoryPath) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("No workspace folder is open.");
            return false;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;
        const fullPath = path.join(workspacePath, directoryPath);
        try {
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`Directory created: ${fullPath}`);
            }
            else {
                console.log(`Directory already exists: ${fullPath}`);
            }
            return true;
        }
        catch (error) {
            console.error(`Failed to create directory ${fullPath}:`, error);
            vscode.window.showErrorMessage(`Failed to create directory: ${directoryPath}`);
            return false;
        }
    }
    vscode.window.showInformationMessage("PestPHP Plugin Activated!");
}
function deactivate() { }
// Utility function to execute a command and update test results
function executeCommandAndUpdateResults(command, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const taskDefinition = {
                type: "shell",
            };
            const task = new vscode.Task(taskDefinition, vscode.TaskScope.Workspace, "Pest Tests", "pest", new vscode.ShellExecution(command));
            const outputChannel = vscode.window.createOutputChannel("Pest Test Results");
            let outputBuffer = "";
            const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
                if (e.execution.task.name === "Pest Tests") {
                    parsePestOutput(outputBuffer, filePath);
                    resolve(e.exitCode === 0);
                    disposable.dispose();
                }
            });
            // Capture terminal output
            const terminal = vscode.window.activeTerminal;
            if (terminal) {
                terminal.show();
                terminal.sendText(command);
            }
            outputChannel.show(true);
            vscode.tasks.executeTask(task).then(() => outputChannel.appendLine(`Running: ${command}`), (err) => {
                outputChannel.appendLine(`Error running task: ${err}`);
                reject(err);
            });
        });
    });
}
// Update test results in a document based on the latest execution results
function updateTestResultsInDocument(document) {
    const filePath = document.uri.fsPath;
    const regex = /\b(it|test)\(['"](.+?)['"],/g;
    const text = document.getText();
    let match;
    while ((match = regex.exec(text)) !== null) {
        const testName = match[2];
        const success = getLatestTestResult(filePath, testName);
        (0, codelensProvider_1.updateTestResult)(filePath, testName, success);
    }
}
// Retrieve the latest test result from the global map
function getLatestTestResult(filePath, testName) {
    const fileResults = testResults.get(filePath);
    if (!fileResults)
        return false;
    return fileResults.get(testName) || false;
}
// Update test results from command output
function parsePestOutput(output, filePath) {
    const fileResults = testResults.get(filePath || "") || new Map();
    const regex = /([✓⨯])\s+(.+?)\s+\.+/g;
    let match;
    while ((match = regex.exec(output)) !== null) {
        const status = match[1] === "✓";
        const testName = match[2];
        fileResults.set(testName, status);
    }
    if (filePath) {
        testResults.set(filePath, fileResults);
    }
}
