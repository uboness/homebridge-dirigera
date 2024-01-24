import { Device } from 'dirigera';
import { LightAttributes } from 'dirigera/dist/src/types/device/Light.js';
import { Outlet as _Outlet, OutletAttributes } from 'dirigera/dist/src/types/device/Outlet.js';
import { PlatformAccessory } from 'homebridge';
import { isBoolean } from '../common.js';
import { DirigeraHub } from '../DirigeraHub.js';
import { DirigeraPlatform } from '../DirigeraPlatform.js';
import { DirigeraDevice } from './DirigeraDevice.js';

export class Outlet extends DirigeraDevice<OutletAttributes> {

    static readonly create = async (platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device): Promise<Outlet> => {
        return new Outlet(platform, hub, accessory, <_Outlet>device);
    };

    private constructor(platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: _Outlet) {
        super(platform, hub, accessory, device, accessory.getService(platform.Service.Outlet) ?? accessory.addService(platform.Service.Lightbulb));

        this.service.getCharacteristic(platform.Characteristic.On)
            .setValue(this.device.attributes.isOn as boolean)
            .onSet(async (value, context) => {
                const isOn = value as boolean;
                this.device.attributes.isOn = isOn;
                if (!context?.fromDirigera) {
                    await hub.setDeviceAttributes(device.id, { isOn } as LightAttributes);
                }
            });

    }

    update(attributes: OutletAttributes) {
        this.device.attributes = attributes;
        if (isBoolean(attributes.isOn)) {
            this.accessory.getService(this.platform.Service.Lightbulb)!
                .getCharacteristic(this.platform.Characteristic.On)
                .updateValue(attributes.isOn, { fromDirigera: true });
        }
    }

    async close() {
    }

}
