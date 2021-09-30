"use strict";

const St = imports.gi.St;
const Gio = imports.gi.Gio; // For custom icons
const panelMenu = imports.ui.panelMenu;
const { arrowIcon, PopupMenuItem } = imports.ui.popupMenu;
const extensionUtils = imports.misc.extensionUtils;
const Me = extensionUtils.getCurrentExtension();
const Docker = Me.imports.src.docker;
const { DockerSubMenu } = Me.imports.src.dockerSubMenuMenuItem;
const GObject = imports.gi.GObject;
const Mainloop = imports.mainloop;
const Lang = imports.lang;

// Docker icon as panel menu
var DockerMenu = GObject.registerClass(
  class DockerMenu extends panelMenu.Button {
    _init(menuAlignment, nameText) {
      super._init(menuAlignment, nameText);

      // Custom Docker icon as menu button
      const hbox = new St.BoxLayout({ style_class: "panel-status-menu-box" });
      const gicon = Gio.icon_new_for_string(
        Me.path + "/icons/docker-symbolic.svg"
      );
      //const panelIcon = (name = "docker-symbolic", styleClass = "system-status-icon") => new St.Icon({ gicon: gioIcon(name), style_class: styleClass, icon_size: "16" });
      const dockerIcon = new St.Icon({
        gicon: gicon,
        style_class: "system-status-icon",
        icon_size: "16",
      });
      const loading = _("Loading...");
      this.buttonText = new St.Label({
        text: loading,
        style: "margin-top:4px;",
      });

      hbox.add_child(dockerIcon);
      hbox.add_child(arrowIcon(St.Side.BOTTOM));
      hbox.add_child(this.buttonText);
      this.add_child(hbox);
      this.connect("button_press_event", this._refreshMenu.bind(this));
      this.menu.addMenuItem(new PopupMenuItem(loading));

      this._refreshCount();
      if (Docker.hasPodman || Docker.hasDocker) {
        this.show();
      }
    }

    // Refresh  the menu everytime the user click on it
    // It allows to have up-to-date information on docker containers
    _refreshMenu() {      
      if (this.menu.isOpen) {        
        this.menu.removeAll();
        this._feedMenu().catch( (e) => this.menu.addMenuItem(new PopupMenuItem(e.message)));
      }     
    }

    _checkServices() {
      if (!Docker.hasPodman && !Docker.hasDocker) {
        let errMsg = _(
          "Please install Docker or Podman to use this plugin"
        );
        this.menu.addMenuItem(new PopupMenuItem(errMsg));
        throw new Error(errMsg);
      }
    }

    async _checkDockerRunning() {
      if (!Docker.hasPodman && !(await Docker.isDockerRunning())) {
        let errMsg = _(
          "Please start your Docker service first!\n(Seems Docker daemon not started yet.)"
        );
        throw new Error(errMsg);
      }
    }

    async _checkUserInDockerGroup() {
      if (!Docker.hasPodman && !(await Docker.isUserInDockerGroup)) {
        let errMsg = _(
          "Please put your Linux user into `docker` group first!\n(Seems not in that yet.)"
        );
        throw new Error(errMsg);
      }
    }

    async _check() {
      return Promise.all(
        [
          this._checkServices(),
          this._checkDockerRunning(),
          //this._checkUserInDockerGroup()
        ]
      );
    }
    
    clearLoop() {
      if (this._timeout) {
        Mainloop.source_remove(this._timeout);
        this._timeout = null;
      }
    }

    async _refreshCount() {
      try {
        this.clearLoop();
        this.containers = await Docker.getContainers();
        
        const dockerCount = this.containers.reduce((acc, container) => container.status.indexOf("Up") > -1 ? acc + 1 : acc, 0);
        
        if (this.buttonText) {
          this.buttonText.set_text(dockerCount.toString(10));
        }
        this._timeout = Mainloop.timeout_add_seconds(
          2,
          Lang.bind(this, this._refreshCount)
        );
      } catch (err) {
        logError(err);
      }
    }
    // Append containers to menu
    async _feedMenu() {      
      await this._check();      
      if (this.containers.length > 0) {
        this.containers.forEach((container) => {
          const subMenu = new DockerSubMenu(
            container.project,
            container.name,
            container.status
          );
          this.menu.addMenuItem(subMenu);
        });
      } else {
        this.menu.addMenuItem(new PopupMenuItem("No containers detected"));
      }    
    }
  }
);
