import { Logger } from 'homebridge';
import { createDirigeraClient, Device } from 'dirigera';
import EventEmitter from 'events';
import { Availability } from './Availability.js';
import { clearTimeout } from 'timers';
import { ContextLogger, ILogger } from './Logger.js';
import { isNil } from './common.js';

type DirigeraClient = Awaited<ReturnType<typeof createDirigeraClient>>;

const HEARTBEAT_TIMEOUT = 10 * 1000;

export class DirigeraHub {

    static async create(config: DirigeraHub.Config, logger: Logger): Promise<DirigeraHub> {
        const gatewayIP = config.host;
        if (isNil(gatewayIP)) {
            throw new Error('Invalid hub configuration. Missing [host] setting');
        }
        const accessToken = config.token ?? await DirigeraHub.authenticate(config.host, logger);
        const client = await createDirigeraClient({
            gatewayIP: config.host,
            accessToken
        });
        config.token = accessToken;
        const info = await client.hub.status();
        const hub = new DirigeraHub(config, info, client, logger);
        await hub.start();
        return hub;
    }

    private static async authenticate(ip: string, logger: Logger): Promise<string> {
        try {
            const c = await createDirigeraClient({ gatewayIP: ip });
            const token = await c.authenticate();
            logger.info(`To avoid creating new users/tokens every time Homebridge starts up, copy the following token and add it under the "token" key in the config entry for hub [${ip}]`);
            logger.info(token);
            return token;
        } catch (e) {
            throw new Error(`Failed to resolve auth token for hub [${ip}]. The link button on the hub must be pressed during start-up`)
        }
    }

    readonly name: string;
    readonly config: DirigeraHub.Config;
    readonly logger: ILogger;
    // private readonly rest: Rest;

    private readonly info: DirigeraHub.Info;
    private readonly client: DirigeraClient;
    private readonly emitter = new EventEmitter();
    private readonly availability = new Availability();
    private heartbeatTimeout: any;


    private constructor(config: DirigeraHub.Config, info: DirigeraHub.Info, client: DirigeraClient, logger: Logger) {
        this.config = config;
        this.name = config.name || info.attributes.customName;
        this.info = info;
        this.client = client;
        this.logger = new ContextLogger(logger, this.name);
        this.availability.on('change', (available, error) => {
            this.emitter.emit('availability', { available, error: error && `${error}` });
        });
    }

    async start() {
        this.client.startListeningForUpdates(update => {
            this.availability.setAvailable(true);
            this.resetHeartbeat();
            this.logger.debug(`event [${JSON.stringify(update)}]`);
            switch (update.type) {
                case 'deviceStateChanged':
                    if (update.data.attributes) {
                        this.emitter.emit('deviceStateChanged', {
                            id: update.data.id,
                            attributes: update.data.attributes
                        });
                    }
                    break;
                case 'deviceAdded':
                    if (update.data) {
                        this.emitter.emit('deviceAdded', update.data);
                    }
                    break;
                case 'deviceRemoved':
                    if (update.data.id) {
                        this.emitter.emit('deviceRemoved', {
                            deviceId: update.data.id,
                            type: update.data.deviceType
                        });
                    }
                    break;
            }
        });
        await this.heartbeat();
    }

    on(event: 'availability', handler: (event: { available: boolean, error?: string }) => void): void;
    on(event: 'deviceStateChanged', handler: (event: DirigeraHub.DeviceStateChange) => void): void;
    on(event: 'deviceAdded', handler: (event: Device) => void)
    on(event: 'deviceRemoved', handler: (event: { deviceId: string, type: Device['deviceType'] }) => void);
    on(event: 'availability' | 'deviceStateChanged' | 'deviceAdded' | 'deviceRemoved', handler: (event: any) => void) {
        this.emitter.on(event, handler);
    }

    async close() {
        this.logger.info(`[hub][${this.name}] closing...`)
        clearTimeout(this.heartbeatTimeout);
        this.client.stopListeningForUpdates();
        this.emitter.removeAllListeners();
    }

    get id() {
        return this.info.attributes.serialNumber;
    }

    get available() {
        return this.availability.available;
    }

    async listDevices(): Promise<Device[]> {
        return this.client.devices.list();
    }

    async identifyDevice(id: string, period: number = 5): Promise<void> {
        const { got } = await import('got');
        const resp = await got.put(`https://${this.config.host}:8443/v1/devices/${id}/identify`, {
            headers: {
                'Authorization': `Bearer ${this.config.token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            json: { period },
            https: {
                rejectUnauthorized: false
            }
        })
        if (resp.statusCode !== 202) {
            this.logger.error(`Failed to identify device [${id}]. ${resp.statusMessage}`);
        }
    }

    async getDevice(id: string): Promise<Device | undefined> {
        try {
            return await this.client.devices.get({ id });
        } catch (error) {
            return undefined;
        }
    }

    async setDeviceAttributes(id: string, attributes: any) {
        await this.client.devices.setAttributes({
            id,
            attributes
        });
    }

    private async heartbeat() {
        try {
            await this.client.hub.status();
            this.availability.setAvailable(true);
            this.logger.debug('heartbeat [success]');
        } catch (error) {
            this.availability.setAvailable(false, `${error}`);
            this.logger.debug(`heartbeat [fail] ${error}`);
        } finally {
            this.resetHeartbeat();
        }
    }

    private resetHeartbeat() {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = setTimeout(() => this.heartbeat(), HEARTBEAT_TIMEOUT)
    }
}

export namespace DirigeraHub {

    export type Config = {
        host: string,
        token?: string,
        name?: string
    };

    export type Info = Awaited<ReturnType<DirigeraClient['hub']['status']>>;

    export type DeviceStateChange = {
        id: string,
        attributes: any
    }
}