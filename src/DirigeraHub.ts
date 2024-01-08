import os from 'os';
import EventEmitter from 'events';
import { Logger } from 'homebridge';
import { createDirigeraClient, Device } from 'dirigera';
import { Availability } from './Availability.js';
import { clearTimeout } from 'timers';
import { ContextLogger, ILogger } from './Logger.js';
import { isNil, wait } from './common.js';
import { calculateCodeChallenge, CODE_CHALLENGE_METHOD, generateCodeVerifier } from './auth.js';

type DirigeraClient = Awaited<ReturnType<typeof createDirigeraClient>>;

const HEARTBEAT_TIMEOUT = 10 * 1000;

export class DirigeraHub {

    static async create(config: DirigeraHub.Config, logger: Logger): Promise<DirigeraHub> {
        const gatewayIP = config.host;
        if (isNil(gatewayIP)) {
            throw new Error('Invalid hub configuration. Missing [host] setting');
        }
        const accessToken = config.token ?? await DirigeraHub.authenticate(config.host, config.name, logger);
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

    private static async authenticate(ip: string, name: string | undefined,  logger: Logger, attempt = 1): Promise<string> {

        const hubDesc = name ? `${name} (${ip})` : ip;

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = calculateCodeChallenge(codeVerifier);

        const { got } = await import('got');
        const { code } = await got.get(`https://${ip}:8443/v1/oauth/authorize`, {
            https: {
                rejectUnauthorized: false
            },
            searchParams: {
                audience: 'homesmart.local',
                response_type: 'code',
                code_challenge: codeChallenge,
                code_challenge_method: CODE_CHALLENGE_METHOD,
            }
        }).json<{ code: string }>();

        logger.info(`\nPress the Action Button on the bottom of your Dirigera Hub [${hubDesc}]\n`);
        let accessToken;
        while (!accessToken) {
            try {
                await wait(5000);
                logger.debug(`authentication attempt ${attempt}`);
                accessToken = (await got.post(`https://${ip}:8443/v1/oauth/token`, {
                    https: {
                        rejectUnauthorized: false
                    },
                    form: {
                        code,
                        name: os.hostname(),
                        grant_type: 'authorization_code',
                        code_verifier: codeVerifier,
                    }
                }).json<{ access_token: string }>()).access_token;

                logger.info(`
                Authentication token resolved. To avoid re-authenticating on each homebridge restart, add it to the hub configuration, e.g.:
                {
                    "host": "${ip}",
                    "token": "${accessToken}",
                    ${name ? `"name": ${name}` : '...'}
                }`);

            } catch (error) {
                if ((<any>error).response.statusCode === 403) {
                    if (attempt % 3 === 0) {
                        logger.info(`\nStill waiting for that Action Button [${hubDesc}]...\n`);
                    }
                    attempt++;
                    if (attempt === 12) {
                        throw new Error(`Could not authenticate to hub [${hubDesc}]. Action button wasn't pressed.`);
                    }
                } else {
                    return DirigeraHub.authenticate(ip, name, logger, attempt++);
                }
            }
        }
        return accessToken;
    }

    readonly name: string;
    readonly config: DirigeraHub.Config;
    readonly logger: ILogger;

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
        this.logger.info(`[hub][${this.name}] closing...`);
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
        });
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
        this.heartbeatTimeout = setTimeout(() => this.heartbeat(), HEARTBEAT_TIMEOUT);
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

