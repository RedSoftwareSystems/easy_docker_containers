import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import {
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import * as libs from "./libs.js";

export function makePrefPanelIconGroup(settings) {
  const parent = new Adw.PreferencesGroup({ title: _("Panel Icon") });

  // Item order must match the "panel-box" values in the schema.
  const boxRow = new Adw.ComboRow({
    title: _("Top bar area"),
    model: Gtk.StringList.new([_("Left"), _("Center"), _("Right")]),
  });
  settings.bind("panel-box", boxRow, "selected", Gio.SettingsBindFlags.DEFAULT);
  parent.add(boxRow);

  libs.makeSpin({
    parent,
    settings,
    title: _("Position in area"),
    subtitle: _("0 is the first (leftmost) position"),
    min: 0,
    max: 20,
    step: 1,
    settingsProperty: "panel-index",
  });

  return parent;
}
