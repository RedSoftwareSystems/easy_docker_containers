"use strict";

import Gio from "gi://Gio";
import GLib from "gi://GLib";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { getExtensionObject } from "../extension.js";

Gio._promisify(Gio.File.prototype, "load_contents_async", "load_contents_finish");

const COMPOSE_PREFIX = "com.docker.compose";
const DEVCONTAINER_PREFIX = "devcontainer";

const stripJsonComments = (json) => {
  let out = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const nextChar = json[i + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        out += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && nextChar === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (!inString && char === "/" && nextChar === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (!inString && char === "/" && nextChar === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    out += char;

    if (char === "\\" && inString) {
      escaped = !escaped;
      continue;
    }

    if (char === '"' && !escaped) {
      inString = !inString;
    }

    if (char !== "\\") {
      escaped = false;
    }
  }

  return out;
};

const stripJsonTrailingCommas = (json) => {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (!inString && char === ",") {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j++;
      if (json[j] === "}" || json[j] === "]") continue;
    }

    out += char;

    if (char === "\\" && inString) {
      escaped = !escaped;
      continue;
    }

    if (char === '"' && !escaped) {
      inString = !inString;
    }

    if (char !== "\\") {
      escaped = false;
    }
  }

  return out;
};

const parseJsonc = (json) =>
  JSON.parse(stripJsonTrailingCommas(stripJsonComments(json)));

const getJsonName = (value) => {
  if (!value) return null;

  if (Array.isArray(value)) {
    return value.map(getJsonName).find(Boolean) || null;
  }

  if (typeof value !== "object") return null;

  if (typeof value.name === "string" && value.name.trim().length) {
    return value.name.trim();
  }

  return null;
};

const readDevcontainerNameFromConfig = async (configFile) => {
  if (!configFile) return null;

  try {
    const file = Gio.File.new_for_path(configFile);
    const [ok, contents] = await file.load_contents_async(null);
    if (!ok) return null;

    const decoder = new TextDecoder("utf-8");
    const config = parseJsonc(decoder.decode(contents));
    return getJsonName(config);
  } catch (e) {
    logError(e);
    return null;
  }
};

const getDevcontainerNameFromMetadata = (metadata) => {
  if (!metadata) return null;

  try {
    return getJsonName(JSON.parse(metadata));
  } catch (e) {
    logError(e);
    return null;
  }
};

const getDevcontainerInfo = async (labels) => {
  const localFolder = labels?.[`${DEVCONTAINER_PREFIX}.local_folder`];
  const configFile = labels?.[`${DEVCONTAINER_PREFIX}.config_file`];
  const metadata = labels?.[`${DEVCONTAINER_PREFIX}.metadata`];

  if (!localFolder && !configFile && !metadata) return null;

  const name =
    labels?.[`${DEVCONTAINER_PREFIX}.name`] ||
    getDevcontainerNameFromMetadata(metadata) ||
    (await readDevcontainerNameFromConfig(configFile)) ||
    (localFolder ? GLib.path_get_basename(localFolder) : null);

  return {
    name,
    localFolder,
    configFile,
  };
};

/**
 * Return the name of the first available terminal emulator, or null if none
 * found. Priority order: kgx > ptyxis > gnome-terminal > x-terminal-emulator.
 * @return {String|null}
 */
const detectTerminal = () => {
  for (const name of ["kgx", "ptyxis", "gnome-terminal", "x-terminal-emulator"]) {
    if (GLib.find_program_in_path(name)) return name;
  }
  return null;
};

/**
 * Open a terminal window at the given folder path
 * @param {String} folderPath The local folder to open the terminal in
 */
export const openTerminalAtFolder = (folderPath) => {
  const terminal = detectTerminal();

  let argv;
  if (terminal === "kgx") {
    argv = ["kgx", "--working-directory", folderPath];
  } else if (terminal === "ptyxis") {
    argv = ["ptyxis", "--working-directory", folderPath];
  } else if (terminal === "gnome-terminal") {
    argv = ["gnome-terminal", "--working-directory", folderPath];
  } else if (terminal === "x-terminal-emulator") {
    // Use GLib.shell_quote so paths with spaces, quotes, or metacharacters
    // are passed safely to the inner shell.
    argv = ["x-terminal-emulator", "-e", "sh", "-c",
      "cd " + GLib.shell_quote(folderPath) + "; exec $SHELL"];
  } else {
    logError(new Error(`No valid terminal found (kgx, ptyxis, gnome-terminal, x-terminal-emulator)`));
    return;
  }

  try {
    const proc = new Gio.Subprocess({
      argv,
      flags: Gio.SubprocessFlags.NONE,
    });
    proc.init(null);
  } catch (e) {
    logError(e);
  }
};

export const dockerCommandsToLabels = {
  start: "Start",
  restart: "Restart",
  stop: "Stop",
  pause: "Pause",
  unpause: "Unpause",
  "compose start": "Start (compose)",
  "compose restart": "Restart  (compose)",
  "compose stop": "Stop  (compose)",
  "compose pause": "Pause  (compose)",
  "compose unpause": "Unpause  (compose)",
  exec: "Exec",
  logs: "Logs",
};

// Tracks workspace folders whose devcontainer is currently being recreated.
// Consumed by the menu to display an animated spinner during the operation.
const _recreatingFolders = new Set();

/**
 * Returns true if the devcontainer for the given workspace folder is currently
 * being recreated (i.e. `devcontainer up --remove-existing-container` is running).
 * @param {string} localFolder
 */
export const isRecreating = (localFolder) => _recreatingFolders.has(localFolder);

/**
 * Returns true if any devcontainer recreation is currently in progress.
 * Used by the menu to decide whether to force a rebuild on open.
 */
export const hasAnyRecreating = () => _recreatingFolders.size > 0;

// Listeners called synchronously (no idle_add) the moment recreation is
// registered, so the menu can update the spinner without any async delay.
const _recreatingStartListeners = new Set();

export const addRecreatingSolderStartListener =
  (fn) => _recreatingStartListeners.add(fn);
export const removeRecreatingSolderStartListener =
  (fn) => _recreatingStartListeners.delete(fn);

/**
 * Schedule an async menu refresh on the next main-loop idle tick.
 *
 * Uses GLib.idle_add so the call returns immediately and never blocks the
 * Promise continuation that triggered it. The refresh runs on the GNOME
 * Shell main loop, which is the only thread allowed to touch UI actors.
 */
const _scheduleMenuRefresh = () => {
  GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
    try {
      getExtensionObject()?._indicator?._refreshMenu?.();
    } catch (e) {
      logError(e);
    }
    return GLib.SOURCE_REMOVE;
  });
};

// Lazily resolved and cached so that GLib.find_program_in_path() is NOT called
// at module-import time (which runs on the GNOME Shell main thread during startup).
// The first actual call happens only after the extension has been fully enabled.
let _hasDocker;
let _hasPodman;
let _hasDevcontainer;

export const hasDocker = () => {
  if (_hasDocker === undefined)
    _hasDocker = !!GLib.find_program_in_path("docker");
  return _hasDocker;
};

export const hasPodman = () => {
  if (_hasPodman === undefined)
    _hasPodman = !!GLib.find_program_in_path("podman");
  return _hasPodman;
};

// Note: GLib.find_program_in_path only searches the GNOME Shell process PATH,
// which will miss tools installed via version managers (NVM, pyenv, rbenv…).
// Use detectDevcontainerCli() for a reliable async check via the user's login shell.
export const hasDevcontainer = () => {
  if (_hasDevcontainer === undefined)
    _hasDevcontainer = !!GLib.find_program_in_path("devcontainer");
  return _hasDevcontainer;
};

/**
 * Return the user's preferred shell, as set by PAM/login in the SHELL
 * environment variable. Falls back to 'sh' if the variable is absent.
 * @return {String} Absolute path to the user's shell (e.g. /bin/bash)
 */
const getUserShell = () => GLib.getenv("SHELL") || "sh";

/**
 * Return the flags needed to make a shell source the user's full environment.
 *
 * Using only -l (login) is not enough for zsh: it sources ~/.zprofile but
 * skips ~/.zshrc, where NVM/pyenv/etc. typically live.
 * Using only -i (interactive) skips login files on bash.
 * Using both -i -l sources everything on bash, zsh, fish, and POSIX sh:
 *   bash  : /etc/profile + ~/.bash_profile (which usually sources ~/.bashrc)
 *   zsh   : ~/.zshenv + ~/.zprofile + ~/.zshrc + ~/.zlogin
 *   fish  : ~/.config/fish/config.fish (config.fish checks `status is-login`)
 *   sh/dash: /etc/profile + ~/.profile
 *
 * @return {String[]} Shell flags array, e.g. ["-i", "-l"]
 */
const getLoginShellFlags = () => ["-i", "-l"];

/**
 * Asynchronously check whether the devcontainer CLI is reachable by running
 * `command -v devcontainer` inside the user's login shell. This correctly
 * finds tools installed via NVM, pyenv, and other version managers.
 * @return {Promise<boolean>}
 */
export const detectDevcontainerCli = async () => {
  try {
    const userShell = getUserShell();
    const result = await execCommand([userShell, ...getLoginShellFlags(), "-c", "command -v devcontainer"]);
    return result.trim().length > 0;
  } catch (e) {
    return false;
  }
};

/**
 * Build the argv array for launching a devcontainer command in a terminal.
 * The command is run via the user's login shell (`$SHELL -l -c <cmd>`) so
 * that tools installed through version managers (NVM, pyenv, rbenv…) are
 * available on PATH without requiring any global symlinks.
 * @param {String} shellCmd The shell command string to run inside the terminal
 * @return {String[]|null} argv array, or null if no terminal was found
 */
const devcontainerTerminalArgv = (shellCmd) => {
  const terminal = detectTerminal();

  // Use the user's interactive login shell so that version-manager shims
  // (NVM, pyenv, rbenv, volta…) in both login files and rc files are on PATH.
  const userShell = getUserShell();
  const shellFlags = getLoginShellFlags();

  if (terminal === "kgx") {
    return ["kgx", "-e", userShell, ...shellFlags, "-c", shellCmd];
  } else if (terminal === "ptyxis") {
    return ["ptyxis", "--", userShell, ...shellFlags, "-c", shellCmd];
  } else if (terminal === "gnome-terminal") {
    return ["gnome-terminal", "--", userShell, ...shellFlags, "-c", shellCmd];
  } else if (terminal === "x-terminal-emulator") {
    return ["x-terminal-emulator", "-e", userShell, ...shellFlags, "-c", shellCmd];
  }

  logError(new Error(`No valid terminal found (kgx, ptyxis, gnome-terminal, x-terminal-emulator)`));
  return null;
};

/**
 * Run a devcontainer CLI command in the background, capturing stdout+stderr
 * to a temporary log file. Resolves with the log path on success, rejects
 * with the log path on failure so the caller can show it in a terminal.
 * @param {String} shellCmd  The full shell command to run
 * @param {String} localFolder  Workspace folder (used to name the log file)
 * @return {Promise<string>}
 */
const runDevcontainerProcess = (shellCmd, localFolder) => {
  const folderName = GLib.path_get_basename(localFolder);
  // Include a timestamp to avoid collisions across concurrent runs or
  // multiple workspaces that share the same basename.
  const logFile = `${GLib.get_tmp_dir()}/devcontainer-${folderName}-${Date.now()}.log`;
  const userShell = getUserShell();
  const shellFlags = getLoginShellFlags();

  return new Promise((resolve, reject) => {
    try {
      const proc = new Gio.Subprocess({
        argv: [userShell, ...shellFlags, "-c", `${shellCmd} > ${GLib.shell_quote(logFile)} 2>&1`],
        flags: Gio.SubprocessFlags.NONE,
      });
      proc.init(null);
      proc.wait_async(null, (proc, res) => {
        try {
          proc.wait_finish(res);
          if (proc.get_successful()) {
            resolve(logFile);
          } else {
            reject(logFile);
          }
        } catch (e) {
          reject(logFile);
        }
      });
    } catch (e) {
      logError(e);
      reject(null);
    }
  });
};

/**
 * Open a terminal showing the contents of a log file, then an interactive
 * shell at the given folder. Used to surface devcontainer errors.
 * @param {String} logFile
 * @param {String} localFolder
 */
const openTerminalWithLog = (logFile, localFolder) => {
  // shell_quote produces a safely-escaped token for arbitrary paths
  // (spaces, quotes, semicolons, etc.) without risking command injection.
  const quotedLog = GLib.shell_quote(logFile);
  const quotedFolder = GLib.shell_quote(localFolder);
  const shellCmd = `cat ${quotedLog}; rm -f ${quotedLog}; cd ${quotedFolder}; exec $SHELL`;
  const argv = devcontainerTerminalArgv(shellCmd);
  if (!argv) return;
  try {
    const proc = new Gio.Subprocess({ argv, flags: Gio.SubprocessFlags.NONE });
    proc.init(null);
  } catch (e) {
    logError(e);
  }
};

/**
 * Start a devcontainer using the devcontainer CLI.
 * Runs in the background; notifies on success or opens a terminal with the
 * captured log on failure.
 * @param {String} localFolder The workspace folder path for the devcontainer
 */
export const runDevcontainerUp = (localFolder) => {
  const folderName = GLib.path_get_basename(localFolder);
  Main.notify("Devcontainer", `Starting ${folderName}…`);

  const quotedFolder = GLib.shell_quote(localFolder);
  runDevcontainerProcess(
    `devcontainer up --workspace-folder ${quotedFolder}`,
    localFolder
  ).then((logFile) => {
    try { Gio.File.new_for_path(logFile).delete(null); } catch (_) { }
    Main.notify("Devcontainer", `${folderName} started`);
  }).catch((logFile) => {
    if (logFile) openTerminalWithLog(logFile, localFolder);
  });
};

/**
 * Recreate a devcontainer using the devcontainer CLI (removes the existing container first).
 * Runs in the background; notifies on success or opens a terminal with the
 * captured log on failure.
 * @param {String} localFolder The workspace folder path for the devcontainer
 */
export const runDevcontainerRecreate = (localFolder) => {
  const folderName = GLib.path_get_basename(localFolder);
  Main.notify("Devcontainer", `Recreating ${folderName}…`);
  _recreatingFolders.add(localFolder);
  // Notify DockerSubMenu instances synchronously so the spinner appears
  // immediately, without waiting for a docker-ps cycle.
  _recreatingStartListeners.forEach(fn => {
    try { fn(localFolder); } catch (e) { logError(e); }
  });

  const quotedFolder = GLib.shell_quote(localFolder);
  runDevcontainerProcess(
    `devcontainer up --remove-existing-container --workspace-folder ${quotedFolder}`,
    localFolder
  ).then((logFile) => {
    _recreatingFolders.delete(localFolder);
    _scheduleMenuRefresh();                             // async: removes spinner from menu
    try { Gio.File.new_for_path(logFile).delete(null); } catch (_) { }
    Main.notify("Devcontainer", `${folderName} recreated`);
    runDevcontainerIDE(localFolder, { silent: true });  // IDE opens only after process done
  }).catch((logFile) => {
    _recreatingFolders.delete(localFolder);
    _scheduleMenuRefresh();                             // async: removes spinner from menu
    if (logFile) openTerminalWithLog(logFile, localFolder);
  });
};

/**
 * Open a devcontainer in the user's configured IDE.
 *
 * Reads the `devcontainer-ide-command` setting, substitutes %workspaceFolder%,
 * and spawns the command in the background via the user's login shell.
 *
 * @param {string} localFolder  The workspace folder path.
 * @param {{ silent?: boolean }} options
 *   silent=true  – do nothing (no notification) when no command is configured.
 *                  Used by the post-recreate auto-trigger.
 *   silent=false – show a notification pointing to prefs when unconfigured.
 *                  Used by the explicit "Open in IDE" menu action.
 */
export const runDevcontainerIDE = (localFolder, { silent = false } = {}) => {
  try {
    const settings = getExtensionObject().getSettings(
      "org.gnome.shell.extensions.easy_docker_containers"
    );
    const cmd = settings.get_string("devcontainer-ide-command");
    if (!cmd || !cmd.trim()) {
      if (!silent) {
        Main.notify(
          "Devcontainer",
          "No IDE command configured. Set one in the extension preferences."
        );
      }
      return;
    }

    const resolvedCmd = cmd.replaceAll("%workspaceFolder%", localFolder);
    const userShell = getUserShell();
    const shellFlags = getLoginShellFlags();
    const proc = new Gio.Subprocess({
      argv: [userShell, ...shellFlags, "-c", resolvedCmd],
      flags: Gio.SubprocessFlags.NONE,
    });
    proc.init(null);
  } catch (e) {
    logError(e);
  }
};

/**
 * Check if Linux user is in 'docker' group (to manage Docker without 'sudo')
 * @return {Promise<Boolean>} whether current Linux user is in 'docker' group or not
 */
export const isUserInDockerGroup = async () => {
  const _userName = GLib.get_user_name();
  const userGroups = await execCommand(["groups", _userName]);
  return !!userGroups.match(/\sdocker[\s\n]/g); // Regex search for ' docker ' or ' docker' in Linux user's groups
};



/**
 * Get an array of containers
 * @return {Promise<Array>} The array of containers as { compose?: {service: string, project: string, configFiles: string, workingDir: string}, devcontainer?: {name: string, localFolder: string, configFile: string}, name: string, status: string }
 */
export const getContainers = async () => {
  const psOut = await execCommand([
    "docker",
    "ps",
    "-a",
    "--format",
    "{{.Names}},{{.Status}}",
  ]);

  const images = psOut
    .split("\n")
    .filter((line) => line.trim().length)
    .map((line) => {
      const [name, status] = line.split(",");
      return {
        name,
        status,
      };
    });

  let containersInfo = [];
  if (images.length) {
    const inspectOut = await execCommand([
      "docker",
      "inspect",
      "-f",
      "{{json .Config.Labels}}",
      ...images.map(({ name }) => name),
    ]);
    containersInfo = inspectOut.trim().split("\n");
  }

  return await Promise.all(containersInfo.map(async (commandOutput, i) => {
    try {
      const jsonOutput = JSON.parse(commandOutput);
      const devcontainerInfo = await getDevcontainerInfo(jsonOutput);
      return {
        ...(jsonOutput[`${COMPOSE_PREFIX}.project`]
          ? {
            compose: {
              service: jsonOutput[`${COMPOSE_PREFIX}.service`],
              project: jsonOutput[`${COMPOSE_PREFIX}.project`],
              configFiles:
                jsonOutput[`${COMPOSE_PREFIX}.project.config_files`],
              workingDir: jsonOutput[`${COMPOSE_PREFIX}.project.working_dir`],
            },
          }
          : {}),
        ...(devcontainerInfo ? { devcontainer: devcontainerInfo } : {}),
        ...images[i],
      };
    } catch (e) {
      logError(e);
      return images[i];
    }
  }));
};

/**
 * Get the number of containers
 * @return {Promise<Number>} The number of running containers
 */
export const getContainerCount = async () => {
  const psOut = await execCommand([
    "docker",
    "ps",
    "--format",
    "{{.Names}},{{.Status}}",
  ]);

  const images = psOut
    .split("\n")
    .filter((line) => line.trim().length)
    .map((line) => {
      const [name, status] = line.split(",");
      return {
        name,
        status,
      };
    });
  return images.length;
};

/**
 * Run a Docker command
 * @param {String} command The command to run
 * @param {String} containerName The container
 * @param {Function} callback A callback that takes the status, command, and stdErr
 */
export const runCommand = async (command, containerName, callback) => {
  const terminal = detectTerminal();

  let cmd = [];
  if (terminal === "kgx") {
    cmd = ["kgx", "-e"];
  } else if (terminal === "ptyxis") {
    cmd = ["ptyxis", "--", "sh", "-c"];
  } else if (terminal === "gnome-terminal") {
    cmd = ["gnome-terminal", "--", "sh", "-c"];
  } else if (terminal === "x-terminal-emulator") {
    cmd = ["x-terminal-emulator", "-e", "sh", "-c"];
  } else {
    callback(false, command, `No valid terminal found (kgx, ptyxis, gnome-terminal, x-terminal-emulator)`);
    return;
  }

  switch (command[0]) {
    case "exec":
      cmd = [...cmd, "'docker exec -it " + containerName + " sh; exec $SHELL'"];
      GLib.spawn_command_line_async(cmd.join(" "));
      break;
    case "logs":
      cmd = [
        ...cmd,
        "'docker logs -f --tail 2000 " + containerName + "; exec $SHELL' ",
      ];
      GLib.spawn_command_line_async(cmd.join(" "));
      break;
    default:
      const [commands, ...commandArguments] = [command].flat();
      const [dockerCommand1, dockerCommand2] = commands.split(" ");

      cmd = [
        "docker",
        dockerCommand1,
        ...(commandArguments ? commandArguments : []),
        ...(dockerCommand2 ? [dockerCommand2] : [containerName]),
      ];
      return execCommand(cmd, callback);
  }
};

export async function execCommand(
  argv,
  callback /*(status, command, err) */,
  cancellable = null,
) {
  try {
    // There is also a reusable Gio.SubprocessLauncher class available
    let proc = new Gio.Subprocess({
      argv: argv,
      // There are also other types of flags for merging stdout/stderr,
      // redirecting to /dev/null or inheriting the parent's pipes
      flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
    });

    // Classes that implement GInitable must be initialized before use, but
    // an alternative in this case is to use Gio.Subprocess.new(argv, flags)
    //
    // If the class implements GAsyncInitable then Class.new_async() could
    // also be used and awaited in a Promise.
    proc.init(null);
    return new Promise((resolve, reject) => {
      // communicate_utf8() returns a string, communicate() returns a
      // GLib.Bytes and there are "headless" functions available as well
      proc.communicate_utf8_async(null, cancellable, (proc, res) => {
        let ok, stdout, stderr;

        try {
          [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
          callback && callback(ok, argv.join(" "), ok ? stdout : stderr);

          if (!ok) {
            const status = proc.get_exit_status();
            throw new Gio.IOErrorEnum({
              code: Gio.io_error_from_errno(status),
              message: stderr ? stderr.trim() : GLib.strerror(status),
            });
          }
          resolve(stdout);
        } catch (e) {
          logError(e);
          reject(e);
        }
      });
    });
  } catch (e) {
    logError(e);
    throw e;
  }
}
