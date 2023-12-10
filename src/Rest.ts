import http from 'http';
import https from 'https';
import { ILogger } from './Logger.js';

// we'll support untrusted certs
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const DEFAULT_CONFIG: Rest.Config = {
    maxSockets: 3,
    keepAlive: true
}

export class Rest {

    private readonly baseUrl: string;
    private readonly config: Rest.Config;
    private readonly agent: http.Agent | https.Agent;

    constructor(baseUrl: string, config: Rest.Config = DEFAULT_CONFIG) {
        this.baseUrl = baseUrl;
        this.config = { ...DEFAULT_CONFIG, ...config };
        const { maxSockets, keepAlive } = this.config;
        this.agent = baseUrl.startsWith('https:') ?
            new https.Agent({ maxSockets, keepAlive }) :
            new http.Agent({ maxSockets, keepAlive });
    }

    async get<RespData = any>(url, req?: Omit<Rest.Req<undefined>, 'method'>): Promise<Rest.Resp<RespData>> {
        return this.request(url, req);
    }

    async post<ReqData = any, RespData = any>(url, req: Omit<Rest.Req<ReqData>, 'method'> = {}): Promise<Rest.Resp<RespData>> {
        return this.request(url, { ...req, method: 'POST' });
    }

    async put<ReqData = any, RespData = any>(url, req: Omit<Rest.Req<ReqData>, 'method'> = {}): Promise<Rest.Resp<RespData>> {
        return this.request(url, { ...req, method: 'PUT' });
    }

    async del<ReqData = any, RespData = any>(url, req: Omit<Rest.Req<ReqData>, 'method'> = {}): Promise<Rest.Resp<RespData>> {
        return this.request(url, { ...req, method: 'DELETE' });
    }

    async options<ReqData = any, RespData = any>(url, req: Omit<Rest.Req<ReqData>, 'method'> = {}): Promise<Rest.Resp<RespData>> {
        return this.request(url, { ...req, method: 'OPTIONS' });
    }

    async request<ReqData = any, RespData = any>(url, req: Rest.Req<ReqData> = {}): Promise<Rest.Resp<RespData>> {
        const fullUrl = `${this.baseUrl}${url}`;
        const { headers: reqHeaders, ...reqConfig } = req;
        const commonHeaders = this.config.headers || {};
        const headers = { ...commonHeaders, ...reqHeaders };
        return rest(fullUrl, {
            ...reqConfig,
            headers,
            agent: this.agent,
            logger: this.config.logger
        });
    }

    close() {
        this.agent.destroy();
    }

}

export namespace Rest {

    export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
    export type Headers = { [key: string]: string };
    export type Params = { [key: string]: string | number | boolean };

    export type Config = {
        headers?: Headers,
        maxSockets?: number,
        keepAlive?: boolean,
        logger?: ILogger
    }

    export type Req<Data> = {
        method?: Method,
        headers?: Headers,
        params?: Params,
        data?: Data,
        signal?: AbortSignal,
        timeout?: number
    }

    export type Resp<Data> = {
        status: number,
        statusMessage: string,
        body: string,
        data: () => Data
    }
}

const DEFAULT_REQ: Rest.Req<any> = { method: 'GET' };

export const rest = async <ReqData = any, RespData = any>(url: string, reqInit: Rest.Req<ReqData> & { logger?: ILogger, agent?: http.Agent } = {}): Promise<Rest.Resp<RespData>> => {
    const { method, headers, params, data, signal, timeout, logger: log, agent } = { ...DEFAULT_REQ, ...reqInit };
    const logger = log?.getLogger('rest', `${method} ${url}`);

    const fullUrl = new URL(url);
    if (params) {
        Object.keys(params).forEach(key => {
            fullUrl.searchParams.set(key, `${params[key]}`);
        });
    }

    return new Promise<Rest.Resp<RespData>>((resolve, reject) => {
        const protocol = fullUrl.protocol === 'http:' ? http : https;
        const req = protocol.request(fullUrl, {
            agent,
            method,
            headers,
            signal,
            timeout
        }, resp => {
            const { statusCode: status, statusMessage } = resp;

            let body = '';
            resp.on('data', chunk => {
                body += chunk
            });
            resp.once('error', error => {
                logger?.debug(`resp error [${method} ${fullUrl}]: ${error}`);
                req.destroy(error);
                reject(error);
            });
            resp.once('close', () => {
                logger?.debug(`resp close [${method} ${fullUrl}]`);
                resolve({
                    status: status!,
                    statusMessage: statusMessage!,
                    body,
                    data: () => JSON.parse(body)
                });
            })
        }).once('error', error => {
            req.destroy(error);
            reject(error);
        }).once('close', () => {
            logger?.debug(`req close [${method} ${fullUrl}]`);
            req.destroy();
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}