"use strict";

import GLib from "gi://GLib";
import St from "gi://St";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import * as Docker from "./docker.js";
import {
  PopupMenuItem,
  PopupMenuSection,
} from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as panelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import { getExtensionObject } from "../extension.js";
import { DockerSubMenu } from "./dockerSubMenuMenuItem.js";

const isContainerUp = (container) => container.status.indexOf("Up") > -1;

// Docker icon as panel menu
export const DockerMenu = GObject.registerClass(
  class DockerMenu extends panelMenu.Button {
    _init(menuAlignment, nameText) {
      super._init(menuAlignment, nameText);
      this._refreshCount = this._refreshCount.bind(this);
      this._refreshMenu = this._refreshMenu.bind(this);
      this._feedMenu = this._feedMenu.bind(this);
      this._updateCountLabel = this._updateCountLabel.bind(this);
      this._timeout = null;
      this._destroyed = false;
      this.settings = getExtensionObject().getSettings(
        "org.gnome.shell.extensions.easy_docker_containers"
      );

      this._counterEnabled = this.settings.get_boolean("counter-enabled");
      this._counterFontSize = this.settings.get_int("counter-font-size");
      this._refreshDelay = this.settings.get_int("refresh-delay");
      this.settings.connect("changed::refresh-delay", this._refreshCount);

      // Custom Docker icon as menu button
      const hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      const gicon = Gio.icon_new_for_string(
        getExtensionObject().path + "/icons/docker-symbolic.svg"
      );

      const dockerIcon = new St.Icon({
        gicon: gicon,
        style_class: "system-status-icon",
        icon_size: "16",
      });

      hbox.add_child(dockerIcon);
      const loading = _("Loading...");
      if (this._counterEnabled) {
        this.buttonText = new St.Label({
          text: loading,
          style: `margin-top:4px;font-size: ${this._counterFontSize}%;`,
        });

        hbox.add_child(this.buttonText);
      }

      this.add_child(hbox);

      const scrollView = new St.ScrollView();
      this.menu._section = new PopupMenuSection();
      if (scrollView.add_actor) {
        scrollView.add_actor(this.menu._section.actor);
      } else {
        scrollView.add_child(this.menu._section.actor);
      }
      this.menu.box.add_child(scrollView);

      this.menu.connect("open-state-changed", this._refreshMenu.bind(this));

      this.menu._section.addMenuItem(new PopupMenuItem(loading));

      // Defer the first docker ps call by 5 s so it does not compete with
      // GNOME Shell's own startup work. The counter will show "Loading…" until
      // the timeout fires, which is preferable to stalling the shell.
      this._timeout = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT_IDLE,
        5,
        () => {
          this._timeout = null;
          if (!this._destroyed)
            this._refreshCount();
          return GLib.SOURCE_REMOVE;
        }
      );
      if (Docker.hasPodman() || Docker.hasDocker()) {
        this.show();
      }
    }

    disable() {
      this.clearLoop();
      super.disable();
    }

    destroy() {
      this._destroyed = true;
      this.clearLoop();
      super.destroy();
    }

    _refreshDelayChanged() {
      this._refreshDelay = this.settings.get_int("refresh-delay");
      // Use a debounced function to avoid running the refresh every time the user changes the value
      this._refreshCount();
    }

    _updateCountLabel(count) {
      if (
        this._counterEnabled &&
        this._refreshDelay > 0 &&
        this._counterFontSize > 0 &&
        this.buttonText.get_text() !== count
      ) {
        this.buttonText.set_text(count.toString(10));
      }
    }

    // Refresh  the menu everytime the user opens it
    // It allows to have up-to-date information on docker containers
    async _refreshMenu() {
      if (!this.menu.isOpen) return;
      try {
        await this._check();
        const containers = await Docker.getContainers();
        this._updateCountLabel(
          containers.filter((container) => isContainerUp(container)).length
        );
        await this._feedMenu(containers);
      } catch (e) {
        this.menu._section.removeAll();
        this.menu._section.addMenuItem(new PopupMenuItem(e.message));
        logError(e);
      }
    }

    _checkServices() {
      if (!Docker.hasPodman() && !Docker.hasDocker()) {
        let errMsg = _("Please install Docker or Podman to use this plugin");
        this.menu._section.addMenuItem(new PopupMenuItem(errMsg));
        throw new Error(errMsg);
      }
    }

    async _checkUserInDockerGroup() {
      if (!Docker.hasPodman() && !(await Docker.isUserInDockerGroup())) {
        let errMsg = _(
          "Please put your Linux user into `docker` group first!\n(Seems not in that yet.)"
        );
        throw new Error(errMsg);
      }
    }

    async _check() {
      // Only verify the docker/podman binary is installed.
      // Daemon-availability is implicitly checked by getContainers() running
      // `docker ps -a`, which fails fast with a descriptive error if the
      // daemon is unreachable. Avoid heavy probes like `docker info` here:
      // they can take many seconds or stall when registry/plugin lookups
      // are slow, leaving the menu stuck on "Loading...".
      this._checkServices();
    }

    clearLoop() {
      if (this._timeout) {
        GLib.source_remove(this._timeout);
      }

      this._timeout = null;
    }

    async _refreshCount() {
      if (this._destroyed) return;

      try {
        // If the extension is not enabled but we have already set a timeout, it means this function
        // is called by the timeout after the extension was disabled, we should just bail out and
        // clear the loop to avoid a race condition infinitely spamming logs about St.Label not longer being accessible
        this.clearLoop();

        const dockerCount = await Docker.getContainerCount();
        this._updateCountLabel(dockerCount);

        // Allow setting a value of 0 to disable background refresh in the settings
        if (this._counterEnabled && !this._destroyed) {
          this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT_IDLE,
            this._refreshDelay,
            this._refreshCount
          );
        }
      } catch (err) {
        logError(err);
        this.clearLoop();
      }
    }

    // Append containers to menu
    async _feedMenu(dockerContainers) {

      // Snapshot the recreating state once so we compare consistently.
      // Rebuild when:
      //   - recreation state changed since last build (started or just finished)
      //     → this is the hook that removes the spinner automatically
      //   - recreation is still in progress (keep the spinner fresh)
      //   - containers list changed (normal docker-ps diff)
      const anyRecreating = Docker.hasAnyRecreating();
      if (
        anyRecreating !== this._anyRecreating ||
        anyRecreating ||
        !this._containers ||
        dockerContainers.length !== this._containers.length ||
        dockerContainers.some((currContainer, i) => {
          const container = this._containers[i];

          return (
            currContainer.project !== container.project ||
            currContainer.name !== container.name ||
            currContainer.devcontainer?.name !== container.devcontainer?.name ||
            currContainer.devcontainer?.localFolder !==
            container.devcontainer?.localFolder ||
            isContainerUp(currContainer) !== isContainerUp(container)
          );
        })
      ) {
        this._anyRecreating = anyRecreating;
        this.menu._section.removeAll();
        this._containers = dockerContainers;
        this._containers.forEach((container) => {
          const subMenu = new DockerSubMenu(
            container.compose,
            container.devcontainer,
            container.name,
            container.status,
            this.menu,
            () => {
              this.menu.close();
            }
          );
          const scrollView = subMenu.menu.actor;
          scrollView.set_mouse_scrolling(false);
          scrollView.set_overlay_scrollbars(false);
          this.menu._section.addMenuItem(subMenu);
        });

        if (!this._containers.length) {
          this.menu._section.addMenuItem(
            new PopupMenuItem("No containers detected")
          );
        }
      }
    }
  }
);
