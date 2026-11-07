import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { DockerMenu } from './src/dockerMenu.js'

// Values of the "panel-box" setting, in schema order.
const PANEL_BOXES = ["left", "center", "right"];

export const getExtensionObject = () => globalThis.DockerContainersExtension;
export default class DockerContainersExtensionObject extends Extension {
  enable() {
    globalThis.DockerContainersExtension = this;
    this._settings = this.getSettings();
    this._indicator = new DockerMenu(0.0, _("Docker containers"));
    Main.panel.addToStatusArea(
      "docker-menu",
      this._indicator,
      this._settings.get_int("panel-index"),
      PANEL_BOXES[this._settings.get_int("panel-box")]
    );
    this._panelSettingsIds = ["changed::panel-box", "changed::panel-index"].map(
      (signal) => this._settings.connect(signal, () => this._moveIndicator())
    );
  }

  _moveIndicator() {
    // ponytail: GNOME has no public API to move an indicator already in the
    // status area, so move its container between the private panel boxes.
    const box = Main.panel[`_${PANEL_BOXES[this._settings.get_int("panel-box")]}Box`];
    const container = this._indicator.container;
    container.get_parent()?.remove_child(container);
    box.insert_child_at_index(container, this._settings.get_int("panel-index"));
  }

  disable() {
    this._panelSettingsIds.forEach((id) => this._settings.disconnect(id));
    this._panelSettingsIds = null;
    this._settings = null;
    this._indicator.clearLoop();
    this._indicator.destroy();
    this._indicator = null;
    delete globalThis.DockerContainersExtension;
  }
}
