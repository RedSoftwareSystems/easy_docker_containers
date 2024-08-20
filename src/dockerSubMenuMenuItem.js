"use strict";

import St from "gi://St";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import { PopupSubMenuMenuItem } from "resource:///org/gnome/shell/ui/popupMenu.js";
import { DockerMenuItem } from "./dockerMenuItem.js";
import { getExtensionObject } from "../extension.js";

/**
 * Create Gio.icon based St.Icon
 *
 * @param {String} name The name of the icon (filename without extension)
 * @param {String} styleClass The style of the icon
 *
 * @return {Object} an St.Icon instance
 */
const gioIcon = (name = "docker-container-unavailable-symbolic") =>
  Gio.icon_new_for_string(
    getExtensionObject().path + "/icons/" + name + ".svg"
  );
const menuIcon = (
  name = "docker-container-unavailable-symbolic",
  styleClass = "system-status-icon"
) =>
  new St.Icon({
    gicon: gioIcon(name),
    style_class: styleClass,
    icon_size: "16",
  });

/**
 * Get the status of a container from the status message obtained with the docker command
 *
 * @param {String} statusMessage The status message
 *
 * @return {String} The status in ['running', 'paused', 'stopped']
 */
const getStatus = (statusMessage) => {
  let status = "stopped";
  if (statusMessage.indexOf("Up") > -1) status = "running";
  if (statusMessage.indexOf("Paused") > -1) status = "paused";

  return status;
};

// Menu entry representing a Docker container
export const DockerSubMenu = GObject.registerClass(
  class DockerSubMenu extends PopupSubMenuMenuItem {
    _init(
      compose,
      containerName,
      containerStatusMessage,
      parentMenu,
      closePopup
    ) {
      super._init(
        compose ? `${compose.project} ∘ ${compose.service}` : containerName
      );
      this._parentMenu = parentMenu;
      const composeParams = compose
        ? [
            "-f",
            `${compose.configFiles}`,
            "--project-directory",
            `${compose.workingDir}`,
            "-p",
            `${compose.project}`,
          ]
        : [];

      switch (getStatus(containerStatusMessage)) {
        case "stopped":
          this.insert_child_at_index(
            menuIcon("docker-container-symbolic", "status-stopped"),
            1
          );

          if (compose) {
            this.menu.addMenuItem(
              new DockerMenuItem(
                containerName,
                ["compose start", ...composeParams],
                menuIcon("docker-container-start-symbolic"),
                closePopup
              )
            );
          }

          this.menu.addMenuItem(
            new DockerMenuItem(
              containerName,
              ["start"],
              menuIcon(
                compose
                  ? "docker-container-start-symbolic-alt"
                  : "docker-container-start-symbolic"
              ),
              closePopup
            )
          );

          break;

        case "running":
          this.insert_child_at_index(
            menuIcon("docker-container-symbolic", "status-running"),
            1
          );

          if (compose) {
            this.menu.addMenuItem(
              new DockerMenuItem(
                containerName,
                ["compose pause", ...composeParams],
                menuIcon("docker-container-pause-symbolic"),
                closePopup
              )
            );

            this.menu.addMenuItem(
              new DockerMenuItem(
                containerName,
                ["compose stop", ...composeParams],
                menuIcon("docker-container-stop-symbolic"),
                closePopup
              )
            );

            this.menu.addMenuItem(
              new DockerMenuItem(
                containerName,
                ["compose restart", ...composeParams],
                menuIcon("docker-container-restart-symbolic"),
                closePopup
              )
            );
          }

          this.menu.addMenuItem(
            new DockerMenuItem(
              containerName,
              ["pause"],
              menuIcon(
                compose
                  ? "docker-container-pause-symbolic-alt"
                  : "docker-container-pause-symbolic"
              ),
              closePopup
            )
          );

          this.menu.addMenuItem(
            new DockerMenuItem(
              containerName,
              ["stop"],
              menuIcon(
                compose
                  ? "docker-container-stop-symbolic-alt"
                  : "docker-container-stop-symbolic"
              ),
              closePopup
            )
          );

          this.menu.addMenuItem(
            new DockerMenuItem(
              containerName,
              ["restart"],
              menuIcon(
                compose
                  ? "docker-container-restart-symbolic-alt"
                  : "docker-container-restart-symbolic"
              ),
              closePopup
            )
          );

          this.menu.addMenuItem(
            new DockerMenuItem(
              containerName,
              ["exec"],
              menuIcon("docker-container-exec-symbolic"),
              closePopup
            )
          );
          break;

        case "paused":
          this.insert_child_at_index(
            menuIcon("docker-container-symbolic", "status-paused"),
            1
          );

          if (compose) {
            this.menu.addMenuItem(
              new DockerMenuItem(
                containerName,
                ["compose unpause"],
                menuIcon("docker-container-start-symbolic"),
                closePopup
              )
            );
          }

          this.menu.addMenuItem(
            new DockerMenuItem(
              containerName,
              ["unpause"],
              menuIcon(
                compose
                  ? "docker-container-start-symbolic-alt"
                  : "docker-container-start-symbolic"
              ),
              closePopup
            )
          );

          break;

        default:
          this.insert_child_at_index(
            menuIcon(
              "docker-container-unavailable-symbolic",
              "status-undefined"
            ),
            1
          );
          break;
      }

      this.menu.addMenuItem(
        new DockerMenuItem(
          containerName,
          ["logs"],
          menuIcon("docker-container-logs-symbolic"),
          closePopup
        )
      );
    }
    _getTopMenu() {
      return this._parentMenu?._getTopMenu() || super._getTopMenu();
    }
  }
);
