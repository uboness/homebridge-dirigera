import { PlatformAccessory, Service } from 'homebridge';
import { isBoolean, isNumber } from '../common.js';
import { WaterSensor, WaterSensorAttributes, XDevice } from '../dirigera.js';
import { DirigeraHub } from '../DirigeraHub.js';
import { DirigeraPlatform } from '../DirigeraPlatform.js';
import { DirigeraDevice } from './DirigeraDevice.js';

export class LeakSensor extends DirigeraDevice<WaterSensorAttributes> {

    static readonly create = async (platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: XDevice): Promise<LeakSensor> => {
        return new LeakSensor(platform, hub, accessory, <WaterSensor>device);
    }

    private battery?: Service;

    private constructor(platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: WaterSensor) {
        super(platform, hub, accessory, device, accessory.getService(platform.Service.LeakSensor) ?? accessory.addService(platform.Service.LeakSensor));

        this.service.getCharacteristic(platform.Characteristic.LeakDetected)
            .setValue(!!this.device.attributes.waterLeakDetected)
            .onSet(async (value, context) => {
                const waterLeakDetected = value as boolean;
                this.device.attributes.waterLeakDetected = waterLeakDetected;
                if (!context?.fromDirigera) {
                    await hub.setDeviceAttributes(device.id, { waterLeakDetected } as Partial<WaterSensorAttributes>);
                }
            });



        if (isNumber(device.attributes.batteryPercentage)) {
            this.battery = accessory.getService(platform.Service.Battery) ?? accessory.addService(platform.Service.Battery);
            this.battery.getCharacteristic(platform.Characteristic.BatteryLevel)
                .setValue(device.attributes.batteryPercentage)
                .onGet(() => this.device.attributes.batteryPercentage as number);
        }
    }

    update(attributes: WaterSensorAttributes) {
        this.device.attributes = attributes;
        if (isBoolean(attributes.waterLeakDetected)) {
            this.accessory.getService(this.platform.Service.LeakSensor)!
                .getCharacteristic(this.platform.Characteristic.LeakDetected)
                .updateValue(attributes.waterLeakDetected, { fromDirigera: true });
        }
        if (isNumber(attributes.batteryPercentage) && this.battery) {
            this.device.attributes.batteryPercentage = attributes.batteryPercentage;
            this.battery.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.device.attributes.batteryPercentage);
        }
    }

    async close(){
    }

}
