import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GObject from "gi://GObject";

export const baseGTypeName =
  "easy_docker_containers@red.software.systems.prefs.";

export const DropdownItems = GObject.registerClass(
  {
    Properties: {
      name: GObject.ParamSpec.string(
        "name",
        "name",
        "name",
        GObject.ParamFlags.READWRITE,
        null
      ),
      value: GObject.ParamSpec.string(
        "value",
        "value",
        "value",
        GObject.ParamFlags.READWRITE,
        null
      ),
    },
  },
  class DropdownItems extends GObject.Object {
    _init(name, value) {
      super._init({ name, value });
    }
  }
);

export function makeSpin(
  options = {
    settings: null,
    settingsProperty: "",
    parent: null,
    value: 0,
    min: 0,
    max: 0,
    step: 1,
    title: "default",
    subtitle: null,
  }
) {
  const row = Adw.SpinRow.new_with_range(
    options.min,
    options.max,
    options.step
  );
  row.title = options.title;
  row.subtitle = options.subtitle || null;

  if (options.parent) {
    options.parent.add(row);
  }

  if (options.settings && options.settingsProperty) {
    options.settings.bind(
      options.settingsProperty,
      row,
      "value",
      Gio.SettingsBindFlags.DEFAULT
    );
  }
  return row;
}

export function makeSwitch(
  options = {
    settings: null,
    settingsProperty: "",
    parent: null,
    value: false,
    title: "default",
    subtitle: null,
  }
) {
  const row = new Adw.SwitchRow({
    title: options.title,
    subtitle: options.subtitle || null,
    // active: false,
  });

  if (options.parent) {
    options.parent.add(row);
  }

  if (options.settings && options.settingsProperty) {
    options.settings.bind(
      options.settingsProperty,
      row,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );
  }
  return row;
}

export function makeCombo(
  options = {
    settings: null,
    settingsProperty: "",
    parent: null,
    options: [{ key: "", caption: "" }],
    value: null,
    title: "default",
    subtitle: null,
  }
) {
  let listStore = new Gio.ListStore({ item_type: DropdownItems });
  options.options.forEach((optionItem) =>
    listStore.append(new DropdownItems(optionItem.key, optionItem.caption))
  );

  const row = new Adw.ComboRow({
    title: options.title,
    subtitle: options.subtitle || null,
    model: filterModeModel,
    expression: new Gtk.PropertyExpression(DropdownItems, null, "name"),
  });

  if (options.parent) {
    options.parent.add(row);
  }

  if (options.settings && options.settingsProperty) {
    options.settings.bind(
      options.settingsProperty,
      row,
      "selected",
      Gio.SettingsBindFlags.DEFAULT
    );
  }
  return row;
}
