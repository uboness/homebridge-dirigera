import { Device } from 'dirigera';
import { Light } from './Light.js';
import { Blinds } from './Blinds.js';
import { DirigeraDevice } from './DirigeraDevice.js';

export const Devices: { [type in Device['deviceType']]?: DirigeraDevice.Factory } = {
    light: Light,
    blinds: Blinds
}