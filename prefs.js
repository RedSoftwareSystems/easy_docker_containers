import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class DockerContainersPreferences extends ExtensionPreferences {
    getIntervalSpinButton = () => {
        const settings = this.getSettings()
        const spin = new Gtk.SpinButton({
            valign: Gtk.Align.CENTER,
            climb_rate: 10,
            digits: 0,
            snap_to_ticks: true,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 3600,
                step_increment: 1,
                page_size: 0,
            }),
        });
        settings.bind("refresh-delay", spin, "value", Gio.SettingsBindFlags.DEFAULT);        
        return spin;
    };

    getCounterFontSizeButton = () => {
        const settings = this.getSettings()
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
        settings.bind("counter-font-size", spin, "value", Gio.SettingsBindFlags.DEFAULT);        
        return spin;
    };

    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup();
        page.add(group);

        const rowRefresh = new Adw.ActionRow({
            title: "Container count refresh interval. Set to 0 to disable",
        });
        group.add(rowRefresh);

        const delayInput = this.getIntervalSpinButton();
        rowRefresh.add_suffix(delayInput);
        rowRefresh.activatable_widget = delayInput;


        const rowCounterFontSize = new Adw.ActionRow({
            title: "Counter font size.",
        });
        group.add(rowCounterFontSize);
        const counterFontSizeInput = this.getCounterFontSizeButton();
        rowCounterFontSize.add_suffix(counterFontSizeInput);
        rowCounterFontSize.activatable_widget = counterFontSizeInput;


        
        window.add(page);
    }

}

