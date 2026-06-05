"use strict";

import { PopupMenuItem } from "resource:///org/gnome/shell/ui/popupMenu.js";
import GObject from "gi://GObject";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Docker from "./docker.js";

// Docker actions for each container
export const DockerMenuItem = GObject.registerClass(
  class DockerMenuItem extends PopupMenuItem {
    _init(containerName, dockerCommand, icon, closePopup, labelOverride = null) {
      const commandName = [dockerCommand].flat()[0];
      super._init(labelOverride || Docker.dockerCommandsToLabels[commandName]);
      this._closePopup = closePopup;

      if (icon) {
        this.insert_child_at_index(icon, 1);
      }

      this.connect("activate", () =>
        this._dockerAction(containerName, dockerCommand)
      );
    }
    _dockerAction(containerName, dockerCommand) {
      this._closePopup?.();
      Docker.runCommand(dockerCommand, containerName, (ok, command, err) => {
        if (ok) {
          Main.notify("Success", "Command `" + command + "` successful");
        } else {
          let errMsg = _("Error occurred when running `" + command + "`");
          Main.notifyError("Error", errMsg);
          logError(err);
        }
      }).catch((err) => {
        Main.notifyError("Error", `${err}`);
      });
    }
  }
);

// Start a devcontainer via `devcontainer up --workspace-folder <localFolder>`
export const DevcontainerStartMenuItem = GObject.registerClass(
  class DevcontainerStartMenuItem extends PopupMenuItem {
    _init(localFolder, icon, closePopup) {
      super._init("Start");
      if (icon) {
        this.insert_child_at_index(icon, 1);
      }
      this.connect("activate", () => {
        closePopup?.();
        Docker.runDevcontainerUp(localFolder);
      });
    }
  }
);

// Open a running devcontainer in the user's configured IDE
export const DevcontainerOpenInIDEMenuItem = GObject.registerClass(
  class DevcontainerOpenInIDEMenuItem extends PopupMenuItem {
    _init(localFolder, icon, closePopup) {
      super._init("Open in IDE");
      if (icon) {
        this.insert_child_at_index(icon, 1);
      }
      this.connect("activate", () => {
        closePopup?.();
        Docker.runDevcontainerIDE(localFolder);
      });
    }
  }
);

// Recreate a stopped devcontainer via `devcontainer up --remove-existing-container`
export const DevcontainerRecreateMenuItem = GObject.registerClass(
  class DevcontainerRecreateMenuItem extends PopupMenuItem {
    _init(localFolder, icon, closePopup) {
      super._init("Recreate and start");
      if (icon) {
        this.insert_child_at_index(icon, 1);
      }
      this.connect("activate", () => {
        // Intentionally do NOT close the popup: keeping the menu open lets
        // the synchronous listener call in runDevcontainerRecreate update
        // the spinner in place, so the user sees it immediately.
        Docker.runDevcontainerRecreate(localFolder);
      });
    }
  }
);
