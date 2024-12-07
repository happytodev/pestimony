"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCodeLensProvider = void 0;
exports.updateTestResult = updateTestResult;
exports.getFailedTests = getFailedTests;
const vscode = require("vscode");
// Store test results
const testResults = new Map();
function updateTestResult(filePath, testName, success) {
    testResults.set(`${filePath}:${testName}`, success);
    console.log('testResults >>>');
    console.log(testResults);
    console.log('<<< End testResults');
}
function getFailedTests(filePath) {
    const failedTests = [];
    testResults.forEach((success, key) => {
        if (!success && key.startsWith(filePath)) {
            const testName = key.split(':')[1];
            failedTests.push(testName);
        }
    });
    return failedTests;
}
class TestCodeLensProvider {
    constructor() {
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
    }
    refresh() {
        console.log("Refreshing CodeLens");
        this._onDidChangeCodeLenses.fire();
    }
    provideCodeLenses(document) {
        const codeLenses = [];
        // Check if the file is a PestPHP test file
        if (!document.fileName.includes("Test")) {
            console.log(`Skipping CodeLens for non-test file: ${document.fileName}`);
            return codeLenses;
        }
        const regex = /\b(it|test)\(['"](.+?)['"],/g;
        const lines = document.getText().split('\n');
        lines.forEach((line, index) => {
            let match;
            while ((match = regex.exec(line)) !== null) {
                const testName = match[2];
                const range = new vscode.Range(index, 0, index, line.length);
                const result = testResults.get(`${document.uri.fsPath}:${testName}`);
                const title = result === true ? '✅ Run This Test' : result === false ? '❌ Run This Test' : 'Run This Test';
                console.log(`Found test: ${testName} at line ${index + 1}`);
                // Add CodeLens for "Run This Test"
                codeLenses.push(new vscode.CodeLens(range, {
                    title,
                    command: 'pest.runSingleTest',
                    arguments: [document.uri.fsPath, testName],
                }));
            }
        });
        // Add a global CodeLens for "Run All Tests"
        codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
            title: 'Run All Tests in File',
            command: 'pest.runAllTests',
            arguments: [document.uri.fsPath],
        }));
        // Add a global CodeLens for "Run Failed Tests" if tests failed
        const failedTests = getFailedTests(document.uri.fsPath);
        if (failedTests.length > 0) {
            codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 1, 0), {
                title: 'Rerun Failed Tests',
                command: 'pest.runFailedTests',
                arguments: [document.uri.fsPath],
            }));
        }
        console.log(`CodeLens added for document: ${document.fileName}`);
        return codeLenses;
    }
}
exports.TestCodeLensProvider = TestCodeLensProvider;
