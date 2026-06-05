"use strict";

import St from "gi://St";
import Gio from "gi://Gio";
import { getExtensionObject } from "../extension.js";

export const gioIcon = (name = "docker-container-unavailable-symbolic") =>
  Gio.icon_new_for_string(
    getExtensionObject().path + "/icons/" + name + ".svg"
  );

export const menuIcon = (
  name = "docker-container-unavailable-symbolic",
  styleClass = "system-status-icon"
) =>
  new St.Icon({
    gicon: gioIcon(name),
    style_class: styleClass,
    icon_size: "16",
  });
