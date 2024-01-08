import {
    API,
    Characteristic,
    DynamicPlatformPlugin,
    Logger,
    PlatformAccessory,
    PlatformConfig,
    Service
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { DirigeraHub } from './DirigeraHub.js';
import { Devices } from './device/index.js';
import { asyncForEach, cleanArrayAsync, cleanMapAsync, isString, isUndefined, spliceFirstMatch } from './common.js';
import { DirigeraDevice } from './device/DirigeraDevice.js';
import { CommonDeviceAttributes } from 'dirigera/dist/src/types/device/Device.js';
import { Device } from 'dirigera';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class DirigeraPlatform implements DynamicPlatformPlugin {

    public readonly Service: typeof Service;
    public readonly Characteristic: typeof Characteristic;

    private readonly accessories: PlatformAccessory[] = [];
    private readonly log: Logger;
    private readonly config: PlatformConfig;
    private readonly api: API;

    private readonly hubs: { [id: string]: DirigeraHub } = {};

    private readonly devices: { [hubId: string]: DirigeraDevice<CommonDeviceAttributes>[] } = {};

    constructor(log: Logger, config: PlatformConfig, api: API) {
        this.log = log;
        this.config = config;
        this.api = api;

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;

        this.log.debug('Finished initializing platform');

        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => this.init());
        this.api.on('shutdown', async () => {
            await cleanMapAsync(this.hubs, async (id, hub) => {
                await hub?.close();
            });
            await cleanMapAsync(this.devices, async (hubId, devices) => {
                await cleanArrayAsync(devices, device => device.close());
            });
        });
    }

    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to set up event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory) {
        this.accessories.push(accessory);
    }

    /**
     * Initializes the platform. All devices are fetched form the DIRIGERA hub and are registered
     * as accessories in Homebridge. The Accessories are registered once, previously created accessories
     * not registered again to prevent "duplicate UUID" errors. Also, any known accessories which represent
     * devices that no longer exist on the DIRIGERA hub, will be removed.
     *
     * Since this is a dynamic platform, `deviceAdded` and `deviceRemoved` events will be listened to on
     * the hub and the relevant accessories will dynamically be created/registered or removed/unregistered
     * accordingly.
     */
    private async init() {

        const hubConfigs = this.config.hubs as DirigeraHub.Config[] || [];
        for (const hubConfig of hubConfigs) {
            try {
                const hub = await DirigeraHub.create(hubConfig, this.log);
                this.log.info(`hub [${hubConfig.host}][${hub.name}] connected`);
                this.hubs[hub.id] = hub;
                this.devices[hub.id] = [];
            } catch (error) {
                this.log.error(`Failed to connect to Dirigera Hub [${hubConfig.host}]. ${error}`);
            }
        }

        // first, let's clean up the cached accessories that are no long available
        const indices = [] as number[];
        for (let i = 0; i < this.accessories.length; i++) {
            const accessory = this.accessories[i];
            const hub = this.hubs[accessory.context.hubId];
            if (!hub || !await hub.getDevice(accessory.context.deviceId)) {
                this.log.info(`Unregistering accessory [${accessory.context.hubName}][${accessory.displayName}] (no longer available)`);
                this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ accessory ])
                indices.push(i);
            }
        }
        indices.forEach(i => this.accessories.splice(i, 1));

        for (const hubId in this.hubs) {
            const hub = this.hubs[hubId];

            const devices = await hub.listDevices();
            for (const device of devices) {
                await this.registerDevice(hub, device);
            }

            hub.on('availability', async availability => {
                this.devices[hubId].forEach(device => device.available = availability.available);
                if (availability.available) {
                    return this.refreshDevices(hub);
                }
            });

            hub.on('deviceStateChanged', change => {
                const device = this.devices[hubId].find(device => device.id === change.id);
                if (device) {
                    device.update(change.attributes);
                }
            });

            hub.on('deviceAdded', device => {
                this.registerDevice(hub, device);
            });

            hub.on('deviceRemoved', event => {
                this.unregisterDevice(hub, event.deviceId);
            });
        }

        this.log.info(`initialized`);
    }

    /**
     * this will be called whenever the hub becomes available again (after it was unavailable)
     * This will fetch all the devices from the DIRIGERA hub and update the appropriate HB devices.
     * Takes care of:
     *   - if some devices were removed from DIREGERA, they should then be unregistered with HB
     *   - if some devices were introduced in DIREGERA, they should then be registered with HB
     *   - for all the already existing devices, their attributes should be updated.
     */
    private async refreshDevices(hub: DirigeraHub) {
        const freshDevices = await hub.listDevices();
        const knownDevices = this.devices[hub.id];
        await asyncForEach(knownDevices, async knownDevice => {
            const freshDevice = freshDevices.find(freshDevice => freshDevice.id === knownDevice.id);
            if (freshDevice) {
                // the known device still exists in the hub... we'll just update its attributes
                await knownDevice.update(freshDevice.attributes);
            } else {
                // the know device no longer exists in the hub, we'll need to remove/unregister it
                await this.unregisterDevice(hub, knownDevice);
            }
        });
        await asyncForEach(freshDevices, async device => {
            if (!knownDevices.find(knownDevice => knownDevice.id === device.id)) {
                await this.registerDevice(hub, device);
            }
        });
    }

    private async registerDevice(hub: DirigeraHub, device: Device) {
        if (isUndefined(Devices[device.deviceType])) {
            return
        }

        // generate a unique id for the accessory this should be generated from
        // something globally unique, but constant, for example, the device serial
        // number or MAC address
        const uuid = this.api.hap.uuid.generate(`${hub.id}:${device.deviceType}:${device.attributes.serialNumber}`);

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        let accessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (!accessory) {
            const deviceName = device.attributes.customName || device.deviceType;
            const displayName = device.room?.name ?
                `${device.room?.name} ${deviceName}` :
                device.attributes.customName;
            accessory = new this.api.platformAccessory(displayName, uuid);
            accessory.context.hubId = hub.id;
            accessory.context.hubName = hub.id;
            accessory.context.deviceId = device.id;
            accessory.context.deviceName = deviceName;
            this.log.info(`[${hub.name}] registering [${device.deviceType}] device [${accessory.displayName}]`);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ accessory ]);
            this.accessories.push(accessory);
        } else {
            this.log.info(`[${hub.name}] found [${device.deviceType}] device [${accessory.displayName}]`);
        }

        accessory.on('identify', async () => {
            this.log.debug(`Identifying [${hub.name}][${device.id}]`);
            await hub.identifyDevice(device.id);
        });

        accessory.getService(this.Service.AccessoryInformation)!
            .setCharacteristic(this.Characteristic.Name, accessory.displayName)
            .setCharacteristic(this.Characteristic.Manufacturer, device.attributes.manufacturer)
            .setCharacteristic(this.Characteristic.Model, device.attributes.model)
            .setCharacteristic(this.Characteristic.FirmwareRevision, device.attributes.firmwareVersion)
            .setCharacteristic(this.Characteristic.SerialNumber, device.attributes.serialNumber);

        this.devices[hub.id].push(await Devices[device.deviceType]!.create(this, hub, accessory, device));
    }

    private async unregisterDevice(hub: DirigeraHub, deviceOrId: string | DirigeraDevice) {
        const deviceId = isString(deviceOrId)? deviceOrId : deviceOrId.id;
        const deviceIndex = this.devices[hub.id].findIndex(device => device.id === deviceId);
        if (deviceIndex < 0) {
            this.log.debug(`device [${deviceOrId}] was removed from DIRIGERA but was not registered with Homebridge`);
            return;
        }
        const [ registeredDevice ] = this.devices[hub.id].splice(deviceIndex, 1);
        this.log.info(`[${hub.name}] unregistering accessory [${registeredDevice.accessory.displayName}] (no longer available)`);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [ registeredDevice.accessory ]);
        spliceFirstMatch(this.accessories, accessory => accessory.UUID === registeredDevice.accessory.UUID);
        await registeredDevice.close()
    }


}