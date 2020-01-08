// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { workspace } from "vscode";
import * as fs from "fs";
import { resolve } from "path";
import * as cp from "child_process";
import { promisify } from "util";
import { EOL } from "os";

type cc_entry = {
  directory: string;
  command: string;
  file: string;
};

function parseCompileCommands(
  compile_commands_json: string
): { [id: string]: cc_entry } {
  console.log("Parsing: " + compile_commands_json);
  let compile_commands = JSON.parse(
    fs.readFileSync(compile_commands_json, "utf8")
  ) as [cc_entry];

  // Now iterate through the array and build up a map from file->command
  var cc: { [id: string]: cc_entry } = {};
  for (let entry of compile_commands) {
    cc[entry.file] = entry;
  }

  return cc;
}

function runIwyu(
  compile_command: cc_entry,
  config: vscode.WorkspaceConfiguration
) {
  let file: string = compile_command.command.substr(
    compile_command.command.indexOf(" ")
  );
  let exe: string = config.get<string>("exe", "include-what-you-use");
  let len: number = config.get<number>("max_line_length", 80);
  let keep: string = config
    .get<Array<string>>("keep", [])
    .map(x => "-Xiwyu --keep=" + x)
    .join(" ");

  // TODO(pokowaka): We could generalize this..
  let trans: string = config.get<boolean>("transitive_includes_only", true)
    ? "-Xiwyu --transitive_includes_only"
    : "";
  let no_fwd_decls: string = config.get<boolean>("no_fwd_decls", false)
    ? "-Xiwyu --no_fwd_decls"
    : "";
  let no_default_mappings: string = config.get<boolean>(
    "no_default_mappings",
    false
  )
    ? "-Xiwyu --no_default_mappings"
    : "";

  var mapping: string = "";
  if (config.get<string>("mapping_file", "").trim() !== "") {
    mapping = "-Xiwyu --mapping_file=" + config.get<string>("mapping_file", "");
  }
  let additional: string = config.get<string>("additional_params", "");

  let pyscript = resolve(__dirname, "fix_includes.py");
  // Params for the python script.
  let comments: string = config.get<boolean>("comments", true)
    ? "--comments"
    : "--nocomments";
  let safe: string = config.get<boolean>("safe", true)
    ? "--safe_headers"
    : "--nosafe_headers";
  let reorder: string = config.get<boolean>("reorder", true)
    ? "--reorder"
    : "--noreorder";
  var ignore_re: string = "";
  if (config.get<string>("ignore_re", "").trim() !== "") {
    ignore_re = "--ignore_re=" + config.get<string>("ignore_re", "");
  }
  var only_re: string = "";
  if (config.get<string>("only_re", "").trim() !== "") {
    only_re = "--only_re=" + config.get<string>("only_re", "");
  }

  var cmd: string = `${exe} -Xiwyu --max_line_length=${len} ${trans} ${mapping} ${keep} ${additional} ${no_fwd_decls} ${no_default_mappings} ${file} 2>&1 | ${pyscript} ${comments} ${safe} ${reorder} ${ignore_re} ${only_re}`;

  console.log(
    "Running: pushd " + compile_command.directory + ";" + cmd + "; popd"
  );

  cp.exec(cmd, { cwd: compile_command.directory }, (err, stdout, stderr) => {
    // Only first few lines have useful things..
    console.log(stdout);
    let of_intereset = stdout
      .split(EOL)
      .filter((e, i, a) => {
        return e.includes("IWYU");
      })
      .join(EOL);
    vscode.window.showInformationMessage(of_intereset);
  });
}

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

  let stat = promisify(fs.stat);
  var cc_mtime: Number = 0;
  stat(compile_commands_json).then(stats => {
    cc_mtime = stats.mtimeMs;
  });
  var cc: { [id: string]: cc_entry } = parseCompileCommands(
    compile_commands_json
  );

  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("extension.iwyu", () => {
    // The code you place here will be executed every time your command is executed
    let editor = vscode.window.activeTextEditor;
    let config = workspace.getConfiguration("iwyu");
    if (!editor) {
      return;
    }
    editor.document.save();
    let fname = editor.document.fileName;

    // Do we need to update our cc?
    stat(compile_commands_json).then(stats => {
      if (cc_mtime !== stats.mtimeMs) {
        cc = parseCompileCommands(compile_commands_json);
      }
      cc_mtime = stats.mtimeMs;
      runIwyu(cc[fname], config);
    });
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
