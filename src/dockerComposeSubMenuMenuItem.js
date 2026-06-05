"use strict";

import Atk from "gi://Atk";
import GObject from "gi://GObject";
import {
  PopupSeparatorMenuItem,
  PopupSubMenuMenuItem,
} from "resource:///org/gnome/shell/ui/popupMenu.js";
import { DockerMenuItem } from "./dockerMenuItem.js";
import { DockerSubMenu } from "./dockerSubMenuMenuItem.js";
import { menuIcon } from "./dockerMenuIcons.js";
import {
  getComposeCommandParams,
  getComposeLabel,
  getComposeStatusClass,
} from "./dockerComposeServices.js";

const isPaused = (container) => container.status.indexOf("Paused") > -1;

const DockerMenuItemLabel = {
  start: "Start",
  restart: "Restart",
  stop: "Stop",
  pause: "Pause",
  unpause: "Unpause",
};

const addComposeAction = (menu, compose, command, iconName, closePopup) => {
  menu.addMenuItem(
    new DockerMenuItem(
      null,
      [`compose ${command}`, ...getComposeCommandParams(compose)],
      menuIcon(iconName),
      closePopup,
      DockerMenuItemLabel[command]
    )
  );
};

const NestedSubMenuMenuItem = GObject.registerClass(
  class NestedSubMenuMenuItem extends PopupSubMenuMenuItem {
    _init(text) {
      super._init(text);
      this._openedSubMenu = null;
    }

    _setOpenedSubMenu(submenu, closingSubmenu = null) {
      if (!submenu) {
        if (!closingSubmenu || this._openedSubMenu === closingSubmenu)
          this._openedSubMenu = null;
        return;
      }

      if (this._openedSubMenu && this._openedSubMenu !== submenu)
        this._openedSubMenu.close(true);

      this._openedSubMenu = submenu;
    }

    _subMenuOpenStateChanged(_menu, open) {
      if (open) {
        this.add_style_pseudo_class("open");
        this.add_accessible_state(Atk.StateType.EXPANDED);
        this.add_style_pseudo_class("checked");
      } else {
        this.remove_style_pseudo_class("open");
        this.remove_accessible_state(Atk.StateType.EXPANDED);
        this.remove_style_pseudo_class("checked");
      }
    }
  }
);

// Menu entry representing one Docker Compose project/file.
export const DockerComposeSubMenu = GObject.registerClass(
  class DockerComposeSubMenu extends PopupSubMenuMenuItem {
    _init(group, parentMenu, closePopup) {
      super._init(`${getComposeLabel(group.compose)} ${group.running}/${group.total}`);
      this._parentMenu = parentMenu;

      this.insert_child_at_index(
        menuIcon(
          "docker-compose-symbolic",
          getComposeStatusClass(group.running, group.total)
        ),
        1
      );

      this._addComposeActions(group, closePopup);
      this.menu.addMenuItem(new PopupSeparatorMenuItem());
      this._addServicesMenu(group, closePopup);
    }

    _addComposeActions(group, closePopup) {
      const { compose, running, total, services } = group;
      const paused = services.filter(isPaused).length;

      if (running === 0) {
        addComposeAction(
          this.menu,
          compose,
          paused === total ? "unpause" : "start",
          "docker-container-start-symbolic",
          closePopup
        );
        return;
      }

      if (running === total) {
        addComposeAction(
          this.menu,
          compose,
          "pause",
          "docker-container-pause-symbolic",
          closePopup
        );
      } else {
        addComposeAction(
          this.menu,
          compose,
          "start",
          "docker-container-start-symbolic",
          closePopup
        );
      }

      addComposeAction(
        this.menu,
        compose,
        "stop",
        "docker-container-stop-symbolic",
        closePopup
      );
      addComposeAction(
        this.menu,
        compose,
        "restart",
        "docker-container-restart-symbolic",
        closePopup
      );
    }

    _addServicesMenu(group, closePopup) {
      const servicesMenu = new NestedSubMenuMenuItem("Services");
      servicesMenu.menu.actor.set_mouse_scrolling(false);
      servicesMenu.menu.actor.set_overlay_scrollbars(true);
      servicesMenu.insert_child_at_index(
        menuIcon(
          "docker-container-symbolic",
          getComposeStatusClass(group.running, group.total)
        ),
        1
      );

      group.services.forEach((service) => {
        servicesMenu.menu.addMenuItem(
          new DockerSubMenu(
            null,
            service.devcontainer,
            service.name,
            service.status,
            this._parentMenu,
            closePopup,
            service.compose.service,
            true,
            servicesMenu
          )
        );
      });

      this.menu.addMenuItem(servicesMenu);
    }

    _getTopMenu() {
      return this._parentMenu?._getTopMenu() || super._getTopMenu();
    }
  }
);
