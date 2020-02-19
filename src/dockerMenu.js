"use strict";

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const panelMenu = imports.ui.panelMenu;
const { arrowIcon, PopupMenuItem } = imports.ui.popupMenu;
const extensionUtils = imports.misc.extensionUtils;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Me = extensionUtils.getCurrentExtension();
const Docker = Me.imports.src.docker;
const { DockerSubMenu } = Me.imports.src.dockerSubMenuMenuItem;
const GObject = imports.gi.GObject;

// Docker icon on status menu
var DockerMenu = GObject.registerClass(
  class DockerMenu extends panelMenu.Button {
    _init(menuAlignment, nameText) {
      super._init(menuAlignment, nameText);

      const hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      const gicon = Gio.icon_new_for_string(Me.path + "/docker.svg");
      const dockerIcon = new St.Icon({ gicon: gicon, icon_size: "24" });
      
      this.buttonText = new St.Label({
        text: _("Loading..."),
        style: 'margin-top:4px;'
      });

      hbox.add_child(dockerIcon);
      hbox.add_child(arrowIcon(St.Side.BOTTOM));
      hbox.add_child(this.buttonText);
      this.add_child(hbox);
      this.connect("button_press_event", this._refreshMenu.bind(this));

      this._renderMenu();
      this._refreshCount();
    }

    // Refresh  the menu everytime the user click on it
    // It allows to have up-to-date information on docker containers
    _refreshMenu() {
      if (this.menu.isOpen) {
        this.menu.removeAll();
        this._renderMenu();
      }
    }

    _refreshCount() {
      let dockerCount = 0;
      try{
        let containers = Docker.getContainers();
        if (containers.length > 0) {
          containers.forEach(container => {
            if(container.status.indexOf("Up") > -1){
              dockerCount++;
            }
          });
        }
      } catch (err) {}
      
      this.buttonText.set_text(dockerCount+'');

      if (this._timeout) {
        Mainloop.source_remove(this._timeout);
        this._timeout = null;
      }

      this._timeout = Mainloop.timeout_add_seconds(2, Lang.bind(this, this._refreshCount));
    }

    // Show docker menu icon only if installed and append docker containers
    _renderMenu() {
      if (Docker.isDockerInstalled()) {
        if (Docker.isDockerRunning()) {
          this._feedMenu();
        } else {
          let errMsg = _("Docker daemon not started");
          this.menu.addMenuItem(new PopupMenuItem(errMsg));
          log(errMsg);
        }
      } else {
        let errMsg = _("Docker binary not found in PATH ");
        this.menu.addMenuItem(new PopupMenuItem(errMsg));
        log(errMsg);
      }
      this.show();
    }

    // Append containers to menu
    _feedMenu() {
      try {
        const containers = Docker.getContainers();
        if (containers.length > 0) {
          containers.forEach(container => {
            const subMenu = new DockerSubMenu(container.name, container.status);
            this.menu.addMenuItem(subMenu);
          });
        } else {
          this.menu.addMenuItem(new PopupMenuItem("No containers detected"));
        }
      } catch (err) {
        const errMsg = "Error occurred when fetching containers";
        this.menu.addMenuItem(new PopupMenuItem(errMsg));
        log(errMsg);
        log(err);
      }
    }
  }
);
