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
    title: _("Group containers by type"),
    subtitle: _("Separate containers into Docker Compose projects, single instances, and devcontainers — each group divided by a separator"),
    settingsProperty: "group-compose-services",
  });

  return parent;
}
