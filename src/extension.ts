// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {
  CodeLens,
  commands,
  DecorationOptions,
  DecorationRangeBehavior,
  DecorationRenderOptions,
  ExtensionContext,
  OverviewRulerLane,
  Position,
  Progress,
  ProgressLocation,
  ProviderResult,
  QuickPickItem,
  Range,
  StatusBarAlignment,
  TextDocument,
  TextEditor,
  TextEditorDecorationType,
  ThemeColor,
  Uri,
  window,
  workspace
} from "vscode";
import * as fs from "fs";
import { resolve } from "path";
import * as cp from "child_process";

type cc_entry = {
  directory: string;
  command: string;
  file: string;
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "pokowaka-iwyu" is now active!');

  let wfd = workspace.rootPath || "";
  let config = workspace.getConfiguration("iwyu");
  let compile_commands_json = config
    .get<string>(
      "compile_commands",
      "${workspaceFolder}/build/compile_commands.json"
    )
    .replace("${workspaceRoot}", wfd)
    .replace("${workspaceFolder}", wfd)
    .replace("${workspaceFolderBasename}", wfd);

  let compile_commands = JSON.parse(
    fs.readFileSync(compile_commands_json, "utf8")
  ) as [cc_entry];

  // Now iterate through the array and build up a map from file->command
  var cc: { [id: string]: cc_entry } = {};
  for (let entry of compile_commands) {
    cc[entry.file] = entry;
  }

  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("extension.iwyu", () => {
    // The code you place here will be executed every time your command is executed
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    editor.document.save();

    let config = workspace.getConfiguration("iwyu");

    let compile_command = cc[editor.document.fileName];
    let file: string = compile_command.command.substr(
      compile_command.command.indexOf(" ")
    );
    let exe: string = config.get<string>("exe", "include-what-you-use");
    let len: number = config.get<number>("max_line_length", 80);
    let why: string = config.get<boolean>("comments", true)
      ? ""
      : "-Xiwyu --no_comments";
    let trans: string = config.get<boolean>("transitive_includes_only", true)
      ? "-Xiwyu --transitive_includes_only"
      : "";
    let mapping: string = config
      .get<Array<string>>("mapping_files", [])
      .map(x => "-Xiwyu --mapping_file=" + x)
      .join(" ");
    let additional: string = config.get<string>("additional_params", "");
    let pyscript = resolve(__dirname, 'fix_includes.py');
    var cmd: string = `${exe} -Xiwyu --max_line_length=${len} ${why} ${trans} ${mapping} ${additional} ${file} 2>&1 | ${pyscript}`;

    console.log("Running: " + cmd);
    //vscode.window.showInformationMessage('Using ' + exe);
    cp.exec(cmd, { cwd: compile_command.directory }, (err, stdout, stderr) => {
      vscode.window.showInformationMessage(stdout);
     });
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}