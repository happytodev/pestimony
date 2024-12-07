"use strict";
// import * as vscode from 'vscode';
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
// export function runTests() {
//   // Demander à l'utilisateur d'entrer le périmètre des tests
//   vscode.window
//     .showInputBox({
//       prompt: 'Enter the scope of tests to run (all, suite, single)',
//       placeHolder: 'Type "all", "suite", or "single"',
//     })
//     .then((scope) => {
//       if (!scope) {
//         vscode.window.showInformationMessage('No scope entered.');
//         return; // Arrêter si aucun choix n'est fait
//       }
//       // Traiter l'entrée utilisateur
//       switch (scope.toLowerCase()) {
//         case 'all':
//           // Lancer le terminal pour tous les tests
//           runTerminalCommand('./vendor/bin/pest');
//           break;
//         case 'suite':
//           vscode.window
//             .showInputBox({ prompt: 'Enter Suite Name' })
//             .then((suite) => {
//               if (suite) {
//                 runTerminalCommand(`./vendor/bin/pest --filter=${suite}`);
//               } else {
//                 vscode.window.showInformationMessage('No suite name entered.');
//               }
//             });
//           break;
//         case 'single':
//           const editor = vscode.window.activeTextEditor;
//           if (editor) {
//             const filePath = editor.document.uri.fsPath;
//             runTerminalCommand(`./vendor/bin/pest ${filePath}`);
//           } else {
//             vscode.window.showErrorMessage(
//               'No active editor found. Open a test file to run.'
//             );
//           }
//           break;
//         default:
//           vscode.window.showErrorMessage('Invalid scope entered. Use "all", "suite", or "single".');
//       }
//     });
// }
// // Fonction utilitaire pour exécuter une commande dans le terminal
// function runTerminalCommand(command: string) {
//   const terminal = vscode.window.createTerminal('Pest Tests');
//   terminal.show();
//   terminal.sendText(command);
// }
const vscode = require("vscode");
function runTests() {
    // Demander à l'utilisateur de choisir le périmètre des tests
    vscode.window
        .showQuickPick(['Run All Tests', 'Run Suite', 'Run Single Test'], {
        placeHolder: 'Select the scope of tests to run',
        canPickMany: false,
    })
        .then((selection) => {
        if (!selection) {
            vscode.window.showInformationMessage('No option selected.');
            return; // Arrêter si aucune sélection n'est faite
        }
        // Déterminer la commande à exécuter
        let command = '';
        switch (selection) {
            case 'Run All Tests':
                command = './vendor/bin/pest';
                break;
            case 'Run Suite':
                return vscode.window
                    .showInputBox({ prompt: 'Enter Suite Name' })
                    .then((suite) => {
                    if (suite) {
                        command = `./vendor/bin/pest --filter=${suite}`;
                        runTerminalCommand(command); // Lancer le terminal avec la commande
                    }
                    else {
                        vscode.window.showInformationMessage('No suite name entered.');
                    }
                });
            case 'Run Single Test':
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const filePath = editor.document.uri.fsPath;
                    command = `./vendor/bin/pest ${filePath}`;
                }
                else {
                    vscode.window.showErrorMessage('No active editor found. Open a test file to run.');
                }
                break;
            default:
                vscode.window.showErrorMessage('Invalid selection.');
        }
        // Lancer le terminal avec la commande, si définie
        if (command) {
            runTerminalCommand(command);
        }
    });
}
// Fonction utilitaire pour exécuter une commande dans le terminal
function runTerminalCommand(command) {
    const terminal = vscode.window.createTerminal('Pest Tests');
    terminal.show();
    terminal.sendText(command);
}
