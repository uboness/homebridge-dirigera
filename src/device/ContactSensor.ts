import { Device } from 'dirigera';
import { OpenCloseSensor, OpenCloseSensorAttributes } from 'dirigera/dist/src/types/device/OpenCloseSensor.js';
import { PlatformAccessory, Service } from 'homebridge';
import { isBoolean, isNumber } from '../common.js';
import { DirigeraHub } from '../DirigeraHub.js';
import { DirigeraPlatform } from '../DirigeraPlatform.js';
import { DirigeraDevice } from './DirigeraDevice.js';

export class ContactSensor extends DirigeraDevice<OpenCloseSensorAttributes> {

    static readonly create = async (platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device): Promise<ContactSensor> => {
        return new ContactSensor(platform, hub, accessory, <OpenCloseSensor>device);
    }

    private battery?: Service;

    private constructor(platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: OpenCloseSensor) {
        super(platform, hub, accessory, device, accessory.getService(platform.Service.ContactSensor) ?? accessory.addService(platform.Service.ContactSensor));

        this.service.getCharacteristic(platform.Characteristic.ContactSensorState)
            .setValue(!!this.device.attributes.isOpen)
            .onSet(async (value, context) => {
                const isOpen = value as boolean;
                this.device.attributes.isOpen = isOpen;
                if (!context?.fromDirigera) {
                    await hub.setDeviceAttributes(device.id, { isOpen } as Partial<OpenCloseSensorAttributes>);
                }
            });



        if (isNumber(device.attributes.batteryPercentage)) {
            this.battery = accessory.getService(platform.Service.Battery) ?? accessory.addService(platform.Service.Battery);
            this.battery.getCharacteristic(platform.Characteristic.BatteryLevel)
                .setValue(device.attributes.batteryPercentage)
                .onGet(() => this.device.attributes.batteryPercentage as number);
        }
    }

    update(attributes: OpenCloseSensorAttributes) {
        this.device.attributes = attributes;
        if (isBoolean(attributes.isOpen)) {
            this.accessory.getService(this.platform.Service.ContactSensor)!
                .getCharacteristic(this.platform.Characteristic.ContactSensorState)
                .updateValue(attributes.isOpen, { fromDirigera: true });
        }
        if (isNumber(attributes.batteryPercentage) && this.battery) {
            this.device.attributes.batteryPercentage = attributes.batteryPercentage;
            this.battery.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.device.attributes.batteryPercentage);
        }
    }

    async close(){
    }

}
