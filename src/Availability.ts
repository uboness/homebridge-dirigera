import EventEmitter from 'events';
import { Detachable } from './common.js';

export class Availability {

    private readonly emitter: EventEmitter = new EventEmitter();
    private _available: boolean;
    private _error?: string | Error;

    constructor(available: boolean = false) {
        this._available = available;
        this.emitter.setMaxListeners(200);
    }

    get available(): boolean {
        return this._available;
    }

    error() {
        return this.error;
    }

    on(event: 'change', handler: (available: boolean, error?: string | Error) => void): Detachable {
        this.emitter.on(event, handler);
        return {
            detach: () => this.emitter.off(event, handler)
        }
    }

    setAvailable(available: boolean, error?: string | Error) {
        const change = this._available !== available;
        this._available = available;
        this._error = error;
        if (change) {
            this.emitter.emit('change', this._available, this._error);
        }
    }

    bindTo(other: Availability): Detachable {
        this.setAvailable(other._available, other._error);
        return other.on('change', (available, error) => {
            this.setAvailable(available, error);
        });
    }

}