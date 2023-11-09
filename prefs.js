import Gio from "gi://Gio";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

import { makePrefCouterGroup } from "./src/prefPages/dockerPrefCounter.js";

const DOCKER_LOG_COMMAND =
  "'docker logs -f --tail 2000 %containerName%; exec $SHELL'";

export const loggingOptions = {
  "x-terminal-emulator": `x-terminal-emulator -e sh -c ${DOCKER_LOG_COMMAND}`,
  "gnome-terminal": `gnome-terminal -- sh -c ${DOCKER_LOG_COMMAND}`,
  kgx: `kgx -e ${DOCKER_LOG_COMMAND}`,
  "custom...": DOCKER_LOG_COMMAND,
};

const loggingOptionsKeys = Object.keys(loggingOptions);

export default class DockerContainersPreferences extends ExtensionPreferences {
  getIntervalSpinButton = () => {
    const settings = this.getSettings();
    const spin = new Gtk.SpinButton({
      valign: Gtk.Align.CENTER,
      climb_rate: 10,
      digits: 0,
      snap_to_ticks: true,
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 3600,
        step_increment: 1,
        page_size: 0,
      }),
    });
    settings.bind(
      "refresh-delay",
      spin,
      "value",
      Gio.SettingsBindFlags.DEFAULT
    );
    return spin;
  };

  getCounterFontSizeButton = () => {
    const settings = this.getSettings();
    const spin = new Gtk.SpinButton({
      valign: Gtk.Align.CENTER,
      climb_rate: 10,
      digits: 0,
      snap_to_ticks: true,
      adjustment: new Gtk.Adjustment({
        lower: 50,
        upper: 100,
        step_increment: 1,
        page_size: 0,
      }),
    });
    settings.bind(
      "counter-font-size",
      spin,
      "value",
      Gio.SettingsBindFlags.DEFAULT
    );
    return spin;
  };

  getTextLoggingCommand = () => {
    const settings = this.getSettings();
    const text = new Gtk.Text();
    settings.bind(
      "selected-logging-command",
      text.buffer,
      "text",
      Gio.SettingsBindFlags.DEFAULT
    );
    return text;
  };

  getDropDownLoggingOptions = (textBox) => {
    const settings = this.getSettings();
    const dropDown = Gtk.DropDown.new_from_strings(loggingOptionsKeys);
    settings.bind(
      "selected-logging-option",
      dropDown,
      "selected",
      Gio.SettingsBindFlags.DEFAULT
    );
    dropDown.connect("notify::selected-item", () => {
      const selectedItem = dropDown.selected;
      textBox.buffer.text = loggingOptions[loggingOptionsKeys[selectedItem]];
    });
    return dropDown;
  };

  getCounterEnableSwitchRow = () => {
    const settings = this.getSettings();
    const counterEnabled = new Adw.SwitchRow({
      title: _("Show containers count..."),
    });
    settings.bind(
      "counter-enabled",
      counterEnabled,
      "active",
      Gio.SettingsBindFlags.DEFAULT
    );

    return counterEnabled;
  };

  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const page = new Adw.PreferencesPage();
    //const group = new Adw.PreferencesGroup();
    const counterGroup = makePrefCouterGroup(settings);
    page.add(counterGroup);

    // const counterEnabledSwitchRow = this.getCounterEnableSwitchRow();
    // group.add(counterEnabledSwitchRow);

    // const rowRefresh = new Adw.ActionRow({
    //   title: "Counter refresh (sec)",
    // });
    // group.add(rowRefresh);

    // const delayInput = this.getIntervalSpinButton();
    // rowRefresh.add_suffix(delayInput);
    // rowRefresh.activatable_widget = delayInput;

    // const rowCounterFontSize = new Adw.ActionRow({
    //   title: "Counter font size.",
    // });
    // group.add(rowCounterFontSize);
    // const counterFontSizeInput = this.getCounterFontSizeButton();
    // rowCounterFontSize.add_suffix(counterFontSizeInput);
    // rowCounterFontSize.activatable_widget = counterFontSizeInput;

    // const rowLoggingOptions = new Adw.ActionRow({
    //   title: "Logging terminal",
    // });
    // group.add(rowLoggingOptions);

    // const rowLoggingCommand = new Adw.ActionRow({ title: "Logging command" });
    // group.add(rowLoggingCommand);

    // const loggingInputCommand = this.getTextLoggingCommand();
    // const loggingOptionsDropDown =
    //   this.getDropDownLoggingOptions(loggingInputCommand);

    // rowLoggingOptions.add_suffix(loggingOptionsDropDown);
    // rowLoggingOptions.activatable_widget = loggingOptionsDropDown;

    // rowLoggingCommand.add_suffix(loggingInputCommand);
    // rowLoggingCommand.activatable_widget = loggingInputCommand;

    window.add(page);
  }
}
