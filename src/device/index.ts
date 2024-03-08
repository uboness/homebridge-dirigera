import { XDevice } from '../dirigera.js';
import { Blinds } from './Blinds.js';
import { ContactSensor } from './ContactSensor.js';
import { DirigeraDevice } from './DirigeraDevice.js';
import { LeakSensor } from './LeakSensor.js';
import { Light } from './Light.js';
import { MotionSensor } from './MotionSensor.js';
import { Outlet } from './Outlet.js';

export const Devices: { [type in XDevice['deviceType']]?: DirigeraDevice.Factory } = {
    light: Light,
    blinds: Blinds,
    openCloseSensor: ContactSensor,
    motionSensor: MotionSensor,
    outlet: Outlet,
    waterSensor: LeakSensor
}