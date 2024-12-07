import * as vscode from "vscode";
import { runTests } from "./commands/runTests";
import { generateUnitTest } from "./commands/generateUnitTest";
import { generateFeatureTest } from "./commands/generateFeatureTest";
import { TestCodeLensProvider, updateTestResult } from "./codelensProvider";

export function activate(context: vscode.ExtensionContext) {

  // Add CodeLensProvider
  const codeLensProvider = new TestCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ language: "php" }, codeLensProvider)
  );

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
  context.subscriptions.push(
    vscode.commands.registerCommand("pest.runTests", runTests),
    vscode.commands.registerCommand("pest.generateFeatureTest", generateFeatureTest),
    vscode.commands.registerCommand("pest.generateUnitTest", generateUnitTest),

    // Command to run a single test
    vscode.commands.registerCommand("pest.runSingleTest", async (filePath, testName) => {
      const command = `./vendor/bin/pest ${filePath} --filter="${testName}"`;
      const success = await executeCommand(command);
      logTestResult(`Test "${testName}" in file "${filePath}"
${success ? "✅ Passed" : "❌ Failed"}`);
      updateTestResult(filePath, testName, success);
      codeLensProvider.refresh();
    }),

    // Command to run all tests on a file
    vscode.commands.registerCommand("pest.runAllTests", async (filePath) => {
      const command = `./vendor/bin/pest ${filePath}`;
      const document = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
      if (document) {
        const regex = /\b(it|test)\(['"](.+?)['"],/g;
        const text = document.getText();
        let match;
        const results: Record<string, boolean> = {};

        // Run each test individually and store the results
        while ((match = regex.exec(text)) !== null) {
          const testName = match[2];
          const testCommand = `./vendor/bin/pest ${filePath} --filter="${testName}"`;
          const success = await executeCommand(testCommand);
          results[testName] = success;
          updateTestResult(filePath, testName, success);
        }

        // Display global results in the console
        logTestResult(`All tests in file "${filePath}" executed.
Results: ${JSON.stringify(results, null, 2)}`);
      }
      codeLensProvider.refresh();
    }),

    // Command to refresh CodeLens
    vscode.commands.registerCommand("pest.refreshCodeLens", () => {
      console.log("Manual refresh triggered");
      codeLensProvider.refresh();
    })
  );

  // Add an output channel for test results
  const testOutputChannel = vscode.window.createOutputChannel("Pest Test Results");
  context.subscriptions.push(testOutputChannel);

  function logTestResult(message: string) {
    testOutputChannel.appendLine(message);
    testOutputChannel.show(true);
  }

  vscode.window.showInformationMessage("PestPHP Plugin Activated!");
}

export function deactivate() {}

// Utility function to execute a command and return a result
async function executeCommand(command: string): Promise<boolean> {
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

    const outputChannel = vscode.window.createOutputChannel("Pest Test Results");

    // Listener to capture task output
    const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution.task.name === "Pest Tests") {
        const exitCode = e.exitCode;
        if (exitCode === 0) {
          outputChannel.appendLine("✅ Tests passed successfully");
          resolve(true);
        } else {
          outputChannel.appendLine("❌ Tests failed");
          resolve(false);
        }
        disposable.dispose(); // Clean the listener
      }
    });

    // Display outputs in the channel
    outputChannel.show(true);
    vscode.tasks.executeTask(task).then(
      () => {
        outputChannel.appendLine(`Running: ${command}`);
      },
      (err) => {
        outputChannel.appendLine(`Error running task: ${err}`);
        reject(err);
      }
    );
  });
}

