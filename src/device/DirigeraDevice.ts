import { XDevice } from '../dirigera.js';
import { DirigeraPlatform } from '../DirigeraPlatform.js';
import { DirigeraHub } from '../DirigeraHub.js';
import { PlatformAccessory, Service } from 'homebridge';
import { Device } from 'dirigera';
import { ILogger } from '../Logger.js';
import { CommonDeviceAttributes } from 'dirigera/dist/src/types/device/Device.js';

export abstract class DirigeraDevice<Attrs extends CommonDeviceAttributes = CommonDeviceAttributes> {

    readonly platform: DirigeraPlatform;
    readonly hub: DirigeraHub;
    readonly accessory: PlatformAccessory;
    readonly device: XDevice;
    readonly service: Service;
    readonly logger: ILogger;

    private _available: boolean;

    protected constructor(platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: XDevice, service: Service) {
        this.platform = platform;
        this.hub = hub;
        this.accessory = accessory;
        this.device = device;
        this.logger = hub.logger.getLogger(this.type, this.name);
        this.service = service;
        this._available = true;
        this.service.setPrimaryService(true);
        this.service.setCharacteristic(platform.Characteristic.Name, accessory.displayName);
        let status = this.service.getCharacteristic(platform.Characteristic.StatusActive);
        if (!status) {
            status = this.service.addCharacteristic(platform.Characteristic.StatusActive);
        }
        status.setValue(this.available);
    }

    abstract update(attributes: Attrs);

    abstract close(): Promise<void>;

    get id() {
        return this.device.id;
    }

    get type() {
        return this.device.deviceType;
    }

    get name() {
        return this.device.attributes.customName;
    }

    get available() {
        return this._available;
    }

    set available(available: boolean) {
        this._available = available;
        this.service.getCharacteristic(this.platform.Characteristic.StatusActive).updateValue(available);
    }

}

export namespace DirigeraDevice {

    export type Factory<T extends DirigeraDevice = DirigeraDevice> = {
        create: (platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device) => Promise<T>
    }
}