import { DirigeraHub } from '../DirigeraHub.js';
import { PlatformAccessory, Service } from 'homebridge';
import { Device } from 'dirigera';
import { DirigeraPlatform } from '../DirigeraPlatform.js';
import { BlindsAttributes } from 'dirigera/dist/src/types/device/Blinds.js';
import { isNumber } from '../common.js';
import { DirigeraDevice } from './DirigeraDevice.js';

const isBlindState = (value: any): value is BlindsAttributes['blindsState'] =>
    value === 'stopped' || value === 'up' || value === 'down';

export class Blinds extends DirigeraDevice<BlindsAttributes> {

    static readonly create = async (platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device): Promise<Blinds> => {
        return new Blinds(platform, hub, accessory, device);
    }

    private readonly battery?: Service;

    private constructor(platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device) {
        super(platform, hub, accessory, device, accessory.getService(platform.Service.WindowCovering) ?? accessory.addService(platform.Service.WindowCovering));

        if (isNumber(device.attributes.batteryPercentage)) {
            this.battery = accessory.getService(platform.Service.Battery) ?? accessory.addService(platform.Service.Battery);
            this.battery.getCharacteristic(platform.Characteristic.BatteryLevel)
                .setValue(device.attributes.batteryPercentage)
                .onGet(() => this.device.attributes.batteryPercentage as number);
        }

        if (isBlindState(device.attributes.blindsState)) {

            this.service.getCharacteristic(platform.Characteristic.HoldPosition)
                .onSet(async () => {
                    const blindsState = 'stopped';
                    await hub.setDeviceAttributes(device.id, { blindsState } as BlindsAttributes);
                    device.attributes.blindsState = blindsState;
                });

            this.service.getCharacteristic(platform.Characteristic.PositionState)
                .setValue(device.attributes.blindsState === 'down' ? 0 : device.attributes.blindsState === 'up' ? 1 : 2)
                .onGet(() => this.device.attributes.blindsState === 'down' ? 0 : this.device.attributes.blindsState === 'up' ? 1 : 2);

            this.service.getCharacteristic(platform.Characteristic.TargetPosition)
                .setValue(device.attributes.blindsTargetLevel as number)
                .onSet(async value => {
                    const blindsTargetLevel = 100 - <number>value;
                    await hub.setDeviceAttributes(device.id, { blindsTargetLevel } as BlindsAttributes);
                    this.device.attributes.blindsTargetLevel = blindsTargetLevel;
                });

            this.service.getCharacteristic(platform.Characteristic.CurrentPosition)
                .setValue(100 - <number>device.attributes.blindsCurrentLevel)
                .onGet(() => 100 - <number>this.device.attributes.blindsCurrentLevel);

        }
    }

    update(attributes: BlindsAttributes) {
        if (isNumber(attributes.batteryPercentage) && this.battery) {
            this.device.attributes.batteryPercentage = attributes.batteryPercentage;
            this.battery.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.device.attributes.batteryPercentage);
        }
        if (isNumber(attributes.blindsTargetLevel)) {
            this.device.attributes.blindsTargetLevel = 100 - <number>attributes.blindsTargetLevel;
            this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.device.attributes.blindsTargetLevel);
        }
        if (isNumber(attributes.blindsCurrentLevel)) {
            this.device.attributes.blindsCurrentLevel = 100 - <number>attributes.blindsCurrentLevel;
            this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, this.device.attributes.blindsCurrentLevel);
        }
    }

    async close(){
    }
}