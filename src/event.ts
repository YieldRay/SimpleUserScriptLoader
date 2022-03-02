export default class {
    _eventTarget = new EventTarget();
    constructor() {}

    on(eventName: string, listener: EventListenerOrEventListenerObject):void {
        this._eventTarget.addEventListener(eventName, listener);
    }
    off(eventName: string, listener: EventListenerOrEventListenerObject):void {
        this._eventTarget.removeEventListener(eventName, listener);
    }
    emit(eventName: string, data: any):boolean {
        return this._eventTarget.dispatchEvent(
            new CustomEvent(eventName, {detail: data})
        );
    }
}
