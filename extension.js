import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { DockerMenu } from './src/dockerMenu.js'

export const getExtensionObject = () => Extension.lookupByUUID('easy_docker_containers@red.software.systems');
export default class DockerContainersExtensionObject extends Extension {
  enable() {
    this._indicator = new DockerMenu(0.0, _("Docker containers"));
    Main.panel.addToStatusArea("docker-menu", this._indicator);
  }

  disable() {
    this._indicator.clearLoop();
    this._indicator.destroy();
    this._indicator = null;
  }
}
