# Easy Docker Containers

A GNOME Shell extension _(GNOME Panel applet)_ to be able to generally control your available Docker containers.

## Screenshot

![Screenshot](./resources/screenshot.png)

## Usage

The following actions are available from the GNOME Panel menu per Docker container:

- **Start (compose)** _(Will start the services of the related compose project when available.)_
- **Stop (compose)** _(Will stop the services of the related compose project when available.)_
- **Pause (compose)** _(Will pause the services of the related compose project when available.)_
- **Restart (compose)** _(Will restart the services of the related compose project when available.)_
- **Start** _(Will start the container.)_
- **Stop** _(Will stop the container.)_
- **Pause** _(Will pause the container.)_
- **Restart** _(Will restart the container.)_
- **Exec** _(Will login to the running container interactively through your default terminal application.)_
- **Logs** _(Will start the running container's Docker logs in your default terminal application.)_

### Menu organization preferences

Container entries are sorted automatically, with running containers before stopped containers and names sorted alphabetically within each state. The menu height is constrained to the active monitor's work area, and scrollbars appear only when the list is too long to fit on screen.

The extension preferences include a container display option:

- **Group containers by type** _(Separates containers into Docker Compose projects, single instances, and devcontainers — each group divided by a separator. Enabled by default.)_

When this option is enabled, the menu is organized into sections divided by separators: Docker Compose projects first, then standalone containers, and finally Dev Container workspaces. Each compose file is collected under a single compose menu that shows the compose project name with a compose-specific icon and a running/total service count, exposes compose-level actions (start, stop, pause, restart) for the whole project, and provides a **Services** submenu for the individual containers. Running or partially running compose groups appear before fully stopped groups.

### Devcontainer support

When a stopped container was created from a [Dev Container](https://containers.dev/) workspace (i.e. the workspace folder contains a `.devcontainer/devcontainer.json`), the extension shows additional information and actions:

- The **devcontainer name** (from `devcontainer.json`) is displayed as a subtitle under the container entry.
- The **workspace folder path** is shown as a clickable item — clicking it opens a terminal at that folder.
- **Start** _(Runs `devcontainer up --workspace-folder <path>` to start the container and apply all lifecycle commands.)_
- **Recreate and start** _(Runs `devcontainer up --remove-existing-container --workspace-folder <path>` to destroy the existing container and create a fresh one from the image.)_

For **running** devcontainers, an additional action is available:

- **Open in IDE** _(Runs the configured IDE command to attach your editor to the running container — see [IDE command](#open-in-ide-command) below.)_

> **Note:** these actions require the [`devcontainer` CLI](https://github.com/devcontainers/cli) to be installed and reachable on `PATH` (including version-manager-managed paths such as NVM or pyenv).

#### Open in IDE command

Configure a shell command in the extension preferences (_Devcontainer → Open in IDE command_) to attach your editor to a devcontainer. The command is triggered in two situations:

- Clicking **Open in IDE** on any **running** devcontainer.
- Automatically after a successful **Recreate and start** (since recreation replaces the container ID, causing IDEs to lose their connection).

Use `%workspaceFolder%` as a placeholder for the workspace folder path. Examples:

| IDE | Command |
|-----|---------|
| VS Code / Cursor | `code --folder-uri "vscode-remote://dev-container+$(printf '%s' '%workspaceFolder%' \| od -An -tx1 \| tr -dc '[:xdigit:]')/workspaceFolder"` |
| Zed | `zed %workspaceFolder%` _(Zed detects the devcontainer on open and prompts to reopen)_ |
| IntelliJ / JetBrains | No CLI hook available — reconnect manually from inside the IDE. |

Leave the field empty to skip this step entirely.

## Prerequisite[^1]

1. Properly installed and already running Docker service.
2. Corresponding Linux user in `docker` Linux group for manage '_Docker_' without `sudo` permission.
3. _(Dev Container features only)_ the [`devcontainer` CLI](https://github.com/devcontainers/cli) installed and on `PATH`.

[^1]: independently from the extension itself

## Installation

- You can simply install this extension from [it's extensions.gnome.org page](https://extensions.gnome.org/extension/2224/easy-docker-containers)[^2],

  [^2]: You could update it from here in the future.

- **or** you can pull it from it's GitHub source code repository directly into it's required GNOME Shell directory [^3]

  1.  `git clone https://github.com/RedSoftwareSystems/easy_docker_containers.git ~/.local/share/gnome-shell/extensions/easy_docker_containers@red.software.systems`
  2.  Restart your shell: **[ALT]** + **[F2]** + _'**r**'_ + **[Enter]** _(or logout and login again)_
  3.  Enable the extension manually with '**_GNOME Extensions_**' application _(or with '**GNOME Tweaks**' application)_.

  [^3]: DO not change this directory name!

## Contributors

- [kiuma](https://github.com/RedSoftwareSystems)
- [Tamas-Toth-ebola](https://github.com/Tamas-Toth-ebola)
- [jacobfogg](https://github.com/jacobfogg)
- [albeto001](https://github.com/albeto001)
- [pierreavizou] (https://github.com/pierreavizou)
- [hhoao] (https://github.com/hhoao)

## Credits

This extension is a fork of [gpouilloux's](https://github.com/gpouilloux) great original [Gnome Shell extension for Docker](https://github.com/gpouilloux/gnome-shell-extension-docker) work.

## License

[GNU - General Public License v3+](https://www.gnu.org/licenses/gpl-3.0.en.html)
