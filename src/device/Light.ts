import { DirigeraHub } from '../DirigeraHub.js';
import { PlatformAccessory } from 'homebridge';
import { Device } from 'dirigera';
import { LightAttributes } from 'dirigera/dist/src/types/device/Light.js';
import { DirigeraPlatform } from '../DirigeraPlatform.js';
import { isBoolean, isNumber } from '../common.js';
import { DirigeraDevice } from './DirigeraDevice.js';

export class Light extends DirigeraDevice<LightAttributes> {

    static readonly create = async (platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device): Promise<Light> => {
        return new Light(platform, hub, accessory, device);
    }

    private constructor(platform: DirigeraPlatform, hub: DirigeraHub, accessory: PlatformAccessory, device: Device) {
        super(platform, hub, accessory, device, accessory.getService(platform.Service.Lightbulb) ?? accessory.addService(platform.Service.Lightbulb));

        this.service.getCharacteristic(platform.Characteristic.On)
            .setValue(this.device.attributes.isOn as boolean)
            .onSet(async (value, context) => {
                const isOn = value as boolean;
                this.device.attributes.isOn = isOn;
                if (!context?.fromDirigera) {
                    await hub.setDeviceAttributes(device.id, { isOn } as LightAttributes);
                }
            });

        if (isNumber(device.attributes.lightLevel)) {
            this.service.getCharacteristic(platform.Characteristic.Brightness)
                .setValue(device.attributes.lightLevel)
                .onSet(async (value, context) => {
                    const lightLevel = value as number;
                    this.device.attributes.lightLevel = lightLevel
                    if (!context?.fromDirigera) {
                        await hub.setDeviceAttributes(device.id, { lightLevel } as LightAttributes);
                    }
                });
        }

        if (isNumber(device.attributes.colorHue)) {
            this.service.getCharacteristic(platform.Characteristic.Hue)
                .setValue(device.attributes.colorHue)
                .onSet(async (value, context) => {
                    const colorHue = value as number;
                    this.device.attributes.colorHue = colorHue;
                    if (!context?.fromDirigera) {
                        await hub.setDeviceAttributes(device.id, { colorHue } as LightAttributes);
                    }
                })
        }

        if (isNumber(device.attributes.colorSaturation)) {
            this.service.getCharacteristic(platform.Characteristic.Saturation)
                .setValue(device.attributes.colorSaturation * 100)
                .onSet(async (value, context) => {
                    const colorSaturation = <number>value / 100;
                    this.device.attributes.colorSaturation = colorSaturation;
                    if (!context?.fromDirigera) {
                        await hub.setDeviceAttributes(device.id, { colorSaturation } as LightAttributes);
                    }
                })
                .onGet(() => <number>device.attributes.colorSaturation * 100);
        }

        if (isNumber(device.attributes.colorTemperature)) {
            const colorTemperatureMin = device.attributes.colorTemperatureMin || 50;
            const colorTemperatureMax = device.attributes.colorTemperatureMax || 450;
            const spectrum = colorTemperatureMax - colorTemperatureMin;
            const ratio = spectrum / 350;
            this.service.getCharacteristic(platform.Characteristic.ColorTemperature)
                .setValue(50 + (device.attributes.colorTemperature - colorTemperatureMin) / ratio)
                .onSet(async (value, context) => {
                    const colorTemperature = colorTemperatureMin + (<number>value - 50) * ratio;
                    device.attributes.colorTemperature = colorTemperature;
                    if (!context.fromDirigera) {
                        await hub.setDeviceAttributes(device.id, { colorTemperature } as LightAttributes)
                    }
                });
        }

    }

    update(attributes: LightAttributes) {
        this.device.attributes = attributes;
        if (isBoolean(attributes.isOn)) {
            this.accessory.getService(this.platform.Service.Lightbulb)!
                .getCharacteristic(this.platform.Characteristic.On)
                .updateValue(attributes.isOn, { fromDirigera: true });
        }
        if (isNumber(attributes.lightLevel)) {
            this.service.getCharacteristic(this.platform.Characteristic.Brightness)
                .updateValue(attributes.lightLevel, { fromDirigera: true });
        }
        if (isNumber(attributes.colorHue)) {
            this.service.getCharacteristic(this.platform.Characteristic.Hue)
                .updateValue(attributes.colorHue, { fromDirigera: true });
        }
        if (isNumber(attributes.colorSaturation)) {
            this.service.getCharacteristic(this.platform.Characteristic.Saturation)
                .updateValue(attributes.colorSaturation * 100, { fromDirigera: true });
        }
        if (isNumber(attributes.colorTemperature)) {
            const colorTemperatureMin = attributes.colorTemperatureMin || this.device.attributes.colorTemperatureMin || 50;
            const colorTemperatureMax = attributes.colorTemperatureMax || this.device.attributes.colorTemperatureMax || 450;
            const spectrum = colorTemperatureMax - colorTemperatureMin;
            const ratio = spectrum / 350;
            const value = 50 + (attributes.colorTemperature - colorTemperatureMin) / ratio;
            this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
                .updateValue(value, { fromDirigera: true });
        }
    }

    async close(){
    }

}
