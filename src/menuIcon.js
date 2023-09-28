"use strict";

const extensionUtils = imports.misc.extensionUtils;
const Me = extensionUtils.getCurrentExtension();
const St = imports.gi.St;
const Gio = imports.gi.Gio; // For custom icons

/**
 * Create Gio.icon based St.Icon
 *
 * @param {String} name The name of the icon (filename without extension)
 * @param {String} styleClass The style of the icon
 *
 * @return {Object} an St.Icon instance
 */
const gioIcon = (name = "docker-container-unavailable-symbolic") =>
  Gio.icon_new_for_string(Me.path + "/icons/" + name + ".svg");

var menuIcon = (
  name = "docker-container-unavailable-symbolic",
  styleClass = "system-status-icon"
) =>
  new St.Icon({
    gicon: gioIcon(name),
    style_class: styleClass,
    icon_size: "16",
  });