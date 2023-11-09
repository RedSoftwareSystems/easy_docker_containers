import Adw from "gi://Adw";
import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import * as libs from "./libs.js";

export function makePrefCouterGroup(settings) {
  const parent = new Adw.PreferencesGroup({ title: _("Counter Indicator") });
  libs.makeSwitch({
    parent,
    settings,
    title: _("Show"),
    settingsProperty: "counter-enabled",
  });
  libs.makeSpin({
    parent,
    settings,
    title: _("Font size %"),
    min: 50,
    max: 100,
    step: 10,
    value: 70,
    settingsProperty: "counter-font-size",
  });
  libs.makeSpin({
    parent,
    settings,
    title: _("Update frequence (sec)"),
    min: 1,
    max: 120,
    step: 1,
    value: 2,
    settingsProperty: "refresh-delay",
  });
  return parent;
}
