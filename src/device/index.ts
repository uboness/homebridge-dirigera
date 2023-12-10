import { Device } from 'dirigera';
import { Light } from './light.js';
import { Blinds } from './blinds.js';
import { DirigeraDevice } from './DirigeraDevice.js';

export const Devices: { [type in Device['deviceType']]?: DirigeraDevice.Factory } = {
    light: Light,
    blinds: Blinds
}