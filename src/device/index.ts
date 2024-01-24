import { Device } from 'dirigera';
import { ContactSensor } from './ContactSensor.js';
import { Light } from './Light.js';
import { Blinds } from './Blinds.js';
import { DirigeraDevice } from './DirigeraDevice.js';
import { MotionSensor } from './MotionSensor.js';
import { Outlet } from './Outlet.js';

export const Devices: { [type in Device['deviceType']]?: DirigeraDevice.Factory } = {
    light: Light,
    blinds: Blinds,
    openCloseSensor: ContactSensor,
    motionSensor: MotionSensor,
    outlet: Outlet
}