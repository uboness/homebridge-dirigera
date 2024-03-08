import { Device } from 'dirigera';
import {
    CommonDeviceAttributes,
    IdentifiableDeviceAttributes,
    JoinableDeviceAttributes
} from 'dirigera/src/types/device/Device.js';

import type { Room } from 'dirigera/src/types/Room.js';

export type XDevice = Omit<Device, 'deviceType' | 'attributes'> & {
    deviceType: Device['deviceType'] | 'waterSensor',
    attributes: Device['attributes'] & Partial<WaterSensorAttributes>
}

export interface WaterSensor extends XDevice {
    type: 'sensor'
    deviceType: 'waterSensor'
    attributes: WaterSensorAttributes,
    room: Room
    isHidden: boolean
}

export interface WaterSensorAttributes extends CommonDeviceAttributes, IdentifiableDeviceAttributes, JoinableDeviceAttributes {
    batteryPercentage: number,
    waterLeakDetected: boolean
}