"use strict";

import { PopupMenuItem } from "resource:///org/gnome/shell/ui/popupMenu.js";
import GObject from "gi://GObject";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Docker from "./docker.js";

// Docker actions for each container
export const DockerMenuItem = GObject.registerClass(
  class DockerMenuItem extends PopupMenuItem {
    _init(containerName, dockerCommand, icon) {
      super._init(Docker.dockerCommandsToLabels[dockerCommand]);
      if (icon) {
        this.insert_child_at_index(icon, 1);
      }

      this.connect("activate", () =>
        this._dockerAction(containerName, dockerCommand)
      );
    }
    _dockerAction(containerName, dockerCommand) {
      Docker.runCommand(dockerCommand, containerName, (ok, command, err) => {
        if (ok) {
          Main.notify("Command `" + command + "` successful");
        } else {
          let errMsg = _("Error occurred when running `" + command + "`");
          Main.notifyError(errMsg);
          logError(err);
        }
      }).catch((err) => {
        Main.notifyError(`${err}`);
        logError(err);
      });
    }
  }
);
