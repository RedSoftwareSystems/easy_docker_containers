"use strict";

import Atk from "gi://Atk";
import Clutter from "gi://Clutter";
import St from "gi://St";
import GObject from "gi://GObject";
import { Spinner } from "resource:///org/gnome/shell/ui/animation.js";
import {
  PopupMenuItem,
  PopupSeparatorMenuItem,
  PopupSubMenuMenuItem,
} from "resource:///org/gnome/shell/ui/popupMenu.js";
import { DockerMenuItem, DevcontainerStartMenuItem, DevcontainerRecreateMenuItem, DevcontainerOpenInIDEMenuItem } from "./dockerMenuItem.js";
import * as Docker from "./docker.js";
import { menuIcon } from "./dockerMenuIcons.js";

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

const getMenuLabel = (compose, containerName, labelOverride = null) =>
  labelOverride || (compose ? `${compose.project} ∘ ${compose.service}` : containerName);

// Menu entry representing a Docker container
export const DockerSubMenu = GObject.registerClass(
  class DockerSubMenu extends PopupSubMenuMenuItem {
    _init(
      compose,
      devcontainer,
      containerName,
      containerStatusMessage,
      parentMenu,
      closePopup,
      labelOverride = null,
      nested = false,
      nestedOwner = null
    ) {
      super._init(getMenuLabel(compose, containerName, labelOverride));
      this._parentMenu = parentMenu;
      this._nested = nested;
      this._nestedOwner = nestedOwner;

      // Store data needed for re-rendering the recreating state later.
      this._devcontainer = devcontainer;
      this._containerName = containerName;
      this._closePopup = closePopup;
      this._inRecreatingSolderState = false;

      if (devcontainer?.name) {
        this._setupDevcontainerName(devcontainer.name);
      }
      if (devcontainer?.localFolder) {
        const localFolderItem = new PopupMenuItem(devcontainer.localFolder);
        localFolderItem.insert_child_at_index(
          menuIcon("docker-devcontainer-info-symbolic"),
          1
        );
        localFolderItem.connect("activate", () => {
          closePopup?.();
          Docker.openTerminalAtFolder(devcontainer.localFolder);
        });
        this.menu.addMenuItem(localFolderItem);
        this.menu.addMenuItem(new PopupSeparatorMenuItem());

        // Register a synchronous listener so that when recreation starts
        // while this menu item is alive, the spinner appears instantly
        // without waiting for a docker-ps rebuild.
        this._onRecreatingSolderStart = (folder) => {
          if (folder === devcontainer.localFolder)
            this._enterRecreatingSolderState();
        };
        Docker.addRecreatingSolderStartListener(this._onRecreatingSolderStart);
        this.connect("destroy", () =>
          Docker.removeRecreatingSolderStartListener(this._onRecreatingSolderStart)
        );
      }

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

      // If recreation is already in progress when the menu is built,
      // enter the spinner state immediately (no docker-ps round-trip needed).
      if (devcontainer?.localFolder && Docker.isRecreating(devcontainer.localFolder)) {
        this._enterRecreatingSolderState();
        return;
      }

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

          if (devcontainer?.localFolder) {
            this.menu.addMenuItem(
              new DevcontainerStartMenuItem(
                devcontainer.localFolder,
                menuIcon(
                  compose
                    ? "docker-container-start-symbolic-alt"
                    : "docker-container-start-symbolic"
                ),
                closePopup
              )
            );
            this.menu.addMenuItem(
              new DevcontainerRecreateMenuItem(
                devcontainer.localFolder,
                menuIcon("docker-devcontainer-recreate-symbolic"),
                closePopup
              )
            );
          } else {
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
          }

          break;

        case "running":
          this.insert_child_at_index(
            menuIcon("docker-container-symbolic", "status-running"),
            1
          );

          if (devcontainer?.localFolder) {
            this.menu.addMenuItem(
              new DevcontainerOpenInIDEMenuItem(
                devcontainer.localFolder,
                menuIcon("docker-devcontainer-open-ide-symbolic"),
                closePopup
              )
            );
            this.menu.addMenuItem(new PopupSeparatorMenuItem());
          }

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
                ["compose unpause", ...composeParams],
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
    /**
     * Switch this menu item to the "recreating" visual state in-place.
     *
     * Replaces the status icon in the header with an animated spinner and
     * rebuilds the submenu to show only a disabled "Recreating…" label and
     * the Logs action. Called synchronously by the recreation-start listener
     * so the update is instant — no docker-ps round-trip required.
     *
     * Guarded by `_inRecreatingSolderState` so repeated calls are no-ops.
     */
    _enterRecreatingSolderState() {
      if (this._inRecreatingSolderState) return;
      this._inRecreatingSolderState = true;

      // ── Header: swap status icon → animated spinner ──────────────────────
      // PopupSubMenuMenuItem children without an icon: [label/labelBox, arrow]
      // With a status icon inserted at index 1:        [label/labelBox, icon, arrow]
      // Remove the icon (if present) before inserting the spinner.
      if (this.get_n_children() >= 3) {
        this.remove_child(this.get_child_at_index(1));
      }
      const spinner = new Spinner(16);
      spinner.play();
      this.insert_child_at_index(spinner, 1);

      // ── Submenu: rebuild with recreating-state items ──────────────────────
      this.menu.removeAll();

      if (this._devcontainer?.localFolder) {
        const localFolderItem = new PopupMenuItem(this._devcontainer.localFolder);
        localFolderItem.insert_child_at_index(
          menuIcon("docker-devcontainer-info-symbolic"), 1
        );
        localFolderItem.connect("activate", () => {
          this._closePopup?.();
          Docker.openTerminalAtFolder(this._devcontainer.localFolder);
        });
        this.menu.addMenuItem(localFolderItem);
        this.menu.addMenuItem(new PopupSeparatorMenuItem());
      }

      const busyItem = new PopupMenuItem("Recreating\u2026");
      busyItem.sensitive = false;
      this.menu.addMenuItem(busyItem);
      this.menu.addMenuItem(new PopupSeparatorMenuItem());
      this.menu.addMenuItem(
        new DockerMenuItem(
          this._containerName, ["logs"],
          menuIcon("docker-container-logs-symbolic"),
          this._closePopup
        )
      );
    }

    _subMenuOpenStateChanged(menu, open) {
      if (!this._nested) {
        super._subMenuOpenStateChanged(menu, open);
        return;
      }

      if (open) {
        this.add_style_pseudo_class("open");
        this._nestedOwner?._setOpenedSubMenu(menu);
        this.add_accessible_state(Atk.StateType.EXPANDED);
        this.add_style_pseudo_class("checked");
      } else {
        this.remove_style_pseudo_class("open");
        this._nestedOwner?._setOpenedSubMenu(null, menu);
        this.remove_accessible_state(Atk.StateType.EXPANDED);
        this.remove_style_pseudo_class("checked");
      }
    }

    _getTopMenu() {
      return this._parentMenu?._getTopMenu() || super._getTopMenu();
    }

    _setupDevcontainerName(devcontainerName) {
      if (!this.label) return;

      const labelIndex = this.get_children().indexOf(this.label);
      const labelBox = new St.BoxLayout({
        vertical: true,
        x_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
      });
      const devcontainerLabel = new St.Label({
        text: devcontainerName,
        style: "font-size: 80%; font-style: italic;",
      });

      this.remove_child(this.label);
      labelBox.add_child(this.label);
      labelBox.add_child(devcontainerLabel);
      this.insert_child_at_index(labelBox, labelIndex >= 0 ? labelIndex : 0);
    }
  }
);
