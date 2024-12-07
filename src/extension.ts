import * as vscode from "vscode";
import { runTests } from "./commands/runTests";
import { generateUnitTest } from "./commands/generateUnitTest";
import { generateFeatureTest } from "./commands/generateFeatureTest";
import {
  TestCodeLensProvider,
  updateTestResult,
  getFailedTests,
} from "./codelensProvider";
import * as fs from "fs";
import * as path from "path";

// Map to store the latest test results
const testResults: Map<string, Map<string, boolean>> = new Map();

export function activate(context: vscode.ExtensionContext) {
  console.log("PestPHP Plugin Activated!");

  // Add the CodeLensProvider
  const codeLensProvider = new TestCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "php" },
      codeLensProvider
    )
  );

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
    if (
      editor &&
      editor.document.languageId === "php" &&
      editor.document.fileName.includes("Test")
    ) {
      console.log(`Active editor changed to: ${editor.document.fileName}`);
      updateTestResultsInDocument(editor.document);
      codeLensProvider.refresh();
    }
  });

  // Register main commands
  context.subscriptions.push(
    vscode.commands.registerCommand("pest.runTests", async () => {
      const scope = await vscode.window.showQuickPick([
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
        await executeCommandAndUpdateResults(command);
        codeLensProvider.refresh();
      } else if (scope === "Run Suite") {
        const suite = await vscode.window.showInputBox({
          prompt: "Enter the suite name",
        });

        if (suite) {
          const command = `./vendor/bin/pest --filter=${suite}`;
          await executeCommandAndUpdateResults(command);
          codeLensProvider.refresh();
        }
      } else if (scope === "Run Single Test") {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const filePath = editor.document.uri.fsPath;
          const command = `./vendor/bin/pest ${filePath}`;
          await executeCommandAndUpdateResults(command);
          codeLensProvider.refresh();
        } else {
          vscode.window.showErrorMessage("No active editor with a test file.");
        }
      }
    }),

    vscode.commands.registerCommand(
      "pest.generateFeatureTest",
      generateFeatureTest
    ),
    vscode.commands.registerCommand("pest.generateUnitTest", generateUnitTest),

    // Command to run a single test
    vscode.commands.registerCommand(
      "pest.runSingleTest",
      async (filePath, testName) => {
        const command = `./vendor/bin/pest ${filePath} --filter=\"${testName}\"`;
        const success = await executeCommandAndUpdateResults(command, filePath);
        logTestResult(`Test "${testName}" in file "${filePath}"
${success ? "✅ Passed" : "❌ Failed"}`);
        updateTestResult(filePath, testName, success);
        codeLensProvider.refresh();
      }
    ),

    // Command to run all tests in a file
    vscode.commands.registerCommand("pest.runAllTests", async (filePath) => {
      ensureTestDirectoriesExist();

      const command = `./vendor/bin/pest ${filePath}`;
      const document = vscode.workspace.textDocuments.find(
        (doc) => doc.uri.fsPath === filePath
      );
      if (document) {
        const regex = /\b(it|test)\(['"](.+?)['"],/g;
        const text = document.getText();
        let match;
        const results: Record<string, boolean> = {};

        // Execute each test individually and store results
        while ((match = regex.exec(text)) !== null) {
          const testName = match[2];
          const testCommand = `./vendor/bin/pest ${filePath} --filter=\"${testName}\"`;
          const success = await executeCommandAndUpdateResults(testCommand, filePath);
          results[testName] = success;
          updateTestResult(filePath, testName, success);
        }

        // Store results in the global map
        if (!testResults.has(filePath)) {
          testResults.set(filePath, new Map());
        }
        const fileResults = testResults.get(filePath)!;
        for (const [testName, success] of Object.entries(results)) {
          fileResults.set(testName, success);
        }

        console.log('filetestResults >>>')
        console.log(fileResults);
        console.log('<<< End testResults')

        // Display global results in the console
        logTestResult(`All tests in file "${filePath}" executed.
Results: ${JSON.stringify(results, null, 2)}`);
      }
      codeLensProvider.refresh();
    }),

    // Command to run only failed tests
    vscode.commands.registerCommand("pest.runFailedTests", async (filePath) => {
      const failedTests = getFailedTests(filePath);
      if (!failedTests.length) {
        vscode.window.showInformationMessage("No failed tests to rerun.");
        return;
      }

      const results: Record<string, boolean> = {};

      for (const testName of failedTests) {
        const command = `./vendor/bin/pest ${filePath} --filter=\"${testName}\"`;
        const success = await executeCommandAndUpdateResults(command, filePath);
        results[testName] = success;
        updateTestResult(filePath, testName, success);
      }

      // Store results in the global map
      if (!testResults.has(filePath)) {
        testResults.set(filePath, new Map());
      }
      const fileResults = testResults.get(filePath)!;
      for (const [testName, success] of Object.entries(results)) {
        fileResults.set(testName, success);
      }

      logTestResult(`Rerun failed tests in file "${filePath}" completed.
Results: ${JSON.stringify(results, null, 2)}`);
      codeLensProvider.refresh();
    }),

    // Command to refresh CodeLens
    vscode.commands.registerCommand("pest.refreshCodeLens", () => {
      console.log("Manual refresh triggered");
      codeLensProvider.refresh();
    })
  );

  // Add an output channel for test results
  const testOutputChannel =
    vscode.window.createOutputChannel("Pest Test Results");
  context.subscriptions.push(testOutputChannel);

  function logTestResult(message: string) {
    testOutputChannel.appendLine(message);
    testOutputChannel.show(true);
  }

  // Ensure required directories exist
  function ensureTestDirectoriesExist(): void {
    ensureDirectoryExists("tests/Unit");
    ensureDirectoryExists("tests/Feature");
  }

  // Ensure the directory exists, and if not, create it
  function ensureDirectoryExists(directoryPath: string): boolean {
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
      } else {
        console.log(`Directory already exists: ${fullPath}`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to create directory ${fullPath}:`, error);
      vscode.window.showErrorMessage(
        `Failed to create directory: ${directoryPath}`
      );
      return false;
    }
  }

  vscode.window.showInformationMessage("PestPHP Plugin Activated!");
}

export function deactivate() {}

// Utility function to execute a command and update test results
async function executeCommandAndUpdateResults(command: string, filePath?: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const taskDefinition: vscode.TaskDefinition = {
      type: "shell",
    };

    const task = new vscode.Task(
      taskDefinition,
      vscode.TaskScope.Workspace,
      "Pest Tests",
      "pest",
      new vscode.ShellExecution(command)
    );

    const outputChannel =
      vscode.window.createOutputChannel("Pest Test Results");
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
    vscode.tasks.executeTask(task).then(
      () => outputChannel.appendLine(`Running: ${command}`),
      (err) => {
        outputChannel.appendLine(`Error running task: ${err}`);
        reject(err);
      }
    );
  });
}

// Update test results in a document based on the latest execution results
function updateTestResultsInDocument(document: vscode.TextDocument): void {
  const filePath = document.uri.fsPath;
  const regex = /\b(it|test)\(['"](.+?)['"],/g;
  const text = document.getText();
  let match;

  while ((match = regex.exec(text)) !== null) {
    const testName = match[2];
    const success = getLatestTestResult(filePath, testName);
    updateTestResult(filePath, testName, success);
  }
}

// Retrieve the latest test result from the global map
function getLatestTestResult(filePath: string, testName: string): boolean {
  const fileResults = testResults.get(filePath);
  if (!fileResults) return false;
  return fileResults.get(testName) || false;
}

// Update test results from command output
function parsePestOutput(output: string, filePath?: string) {
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

