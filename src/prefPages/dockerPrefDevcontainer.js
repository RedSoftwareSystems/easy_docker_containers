import Adw from "gi://Adw";
import {
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import * as libs from "./libs.js";

const PLACEHOLDER = "%workspaceFolder%";

// Example commands shown as hints in the group description.
// Each IDE replaces %workspaceFolder% with the actual path at runtime.
// IntelliJ / JetBrains IDEs have no CLI hook for devcontainer reattachment
// (their flow is fully UI-driven), so no example is provided for them.
const EXAMPLES = [
  `VS Code / Cursor:`,
  `  code --folder-uri "vscode-remote://dev-container+$(printf '%s' '${PLACEHOLDER}' | od -An -tx1 | tr -dc '[:xdigit:]')/workspaceFolder"`,
  `Zed (detects devcontainer on open):`,
  `  zed ${PLACEHOLDER}`,
  `IntelliJ / JetBrains: no CLI hook — reconnect manually from the IDE.`,
].join("\n");

export function makePrefDevcontainerGroup(settings) {
  const parent = new Adw.PreferencesGroup({
    title: _("Devcontainer"),
    description: _(
      `Shell command used to open a devcontainer in your IDE.\n` +
      `Triggered by \"Open in IDE\" on running containers and automatically after \"Recreate and start\".\n` +
      `${PLACEHOLDER} is replaced with the workspace folder path. Leave empty to skip.\n\n` +
      EXAMPLES
    ),
  });

  libs.makeEntry({
    parent,
    settings,
    title: _("Open in IDE command"),
    settingsProperty: "devcontainer-ide-command",
  });

  return parent;
}
