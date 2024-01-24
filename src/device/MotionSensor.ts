import { Device } from 'dirigera';
import { MotionSensor as _MotionSensor, MotionSensorAttributes } from 'dirigera/dist/src/types/device/MotionSensor.js';
import { PlatformAccessory, Service } from 'homebridge';
import { isBoolean, isNumber } from '../common.js';
import { DirigeraHub } from '../DirigeraHub.js';
import { DirigeraPlatform } from '../DirigeraPlatform.js';
import { DirigeraDevice } from './DirigeraDevice.js';

export class MotionSensor extends DirigeraDevice<MotionSensorAttributes> {

    static readonly create = async (platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device): Promise<MotionSensor> => {
        return new MotionSensor(platform, hub, accessory, <_MotionSensor>device);
    }

    private battery?: Service;

    private constructor(platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: _MotionSensor) {
        super(platform, hub, accessory, device, accessory.getService(platform.Service.MotionSensor) ?? accessory.addService(platform.Service.MotionSensor));

        this.service.getCharacteristic(platform.Characteristic.MotionDetected)
            .setValue(!!this.device.attributes.isOn)
            .onSet(async (value, context) => {
                const isOn = value as boolean;
                this.device.attributes.isOn = isOn;
                if (!context?.fromDirigera) {
                    await hub.setDeviceAttributes(device.id, { isOn } as MotionSensorAttributes);
                }
            });



        if (isNumber(device.attributes.batteryPercentage)) {
            this.battery = accessory.getService(platform.Service.Battery) ?? accessory.addService(platform.Service.Battery);
            this.battery.getCharacteristic(platform.Characteristic.BatteryLevel)
                .setValue(device.attributes.batteryPercentage)
                .onGet(() => this.device.attributes.batteryPercentage as number);
        }
    }

    update(attributes: MotionSensorAttributes) {
        this.device.attributes = attributes;
        if (isBoolean(attributes.isOn)) {
            this.accessory.getService(this.platform.Service.MotionSensor)!
                .getCharacteristic(this.platform.Characteristic.MotionDetected)
                .updateValue(attributes.isOn, { fromDirigera: true });
        }
        if (isNumber(attributes.batteryPercentage) && this.battery) {
            this.device.attributes.batteryPercentage = attributes.batteryPercentage;
            this.battery.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.device.attributes.batteryPercentage);
        }
    }

    async close(){
    }

}
