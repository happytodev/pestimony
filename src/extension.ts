import * as vscode from "vscode";
import { runTests } from "./commands/runTests";
import { generateUnitTest } from "./commands/generateUnitTest";
import { generateFeatureTest } from "./commands/generateFeatureTest";

export function activate(context: vscode.ExtensionContext) {
  console.log("PestPHP Plugin Activated!");

  context.subscriptions.push(
    vscode.commands.registerCommand("pest.runTests", runTests),
    vscode.commands.registerCommand("pest.generateFeatureTest", generateFeatureTest),
    vscode.commands.registerCommand("pest.generateUnitTest", generateUnitTest)
  );

  vscode.window.showInformationMessage("PestPHP Plugin Activated!");
}

export function deactivate() {}
