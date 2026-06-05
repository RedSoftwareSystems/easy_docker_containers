import Adw from "gi://Adw";
import {
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import * as libs from "./libs.js";

export function makePrefContainersGroup(settings) {
  const parent = new Adw.PreferencesGroup({ title: _("Containers") });

  libs.makeSwitch({
    parent,
    settings,
    title: _("Sort by name"),
    subtitle: _("Show containers alphabetically in the menu"),
    settingsProperty: "sort-containers-by-name",
  });

  return parent;
}
