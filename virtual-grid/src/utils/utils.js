"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Property {
    constructor() {
        this._subscriptions = new Array();
    }
    get value() {
        return this._value;
    }
    set value(newValue) {
        if (this._value != newValue) {
            this._value = newValue;
            for (var s of this._subscriptions) {
                s(newValue);
            }
        }
    }
    onChanged(subscription) {
        this._subscriptions.push(subscription);
        return () => {
            var index = this._subscriptions.indexOf(subscription);
            if (index >= 0) {
                this._subscriptions.splice(index);
            }
        };
    }
}
exports.Property = Property;
class ComponentBase {
    constructor() {
        this.subscriptions = new Array();
    }
    anchor(subscription) {
        this.subscriptions.push(subscription);
    }
    anchorx(subscription) {
        this.subscriptions.push(subscription.unsubscribe);
    }
    ngOnDestroy() {
        for (var s of this.subscriptions) {
            s();
        }
        this.subscriptions.splice(0, this.subscriptions.length);
    }
}
exports.ComponentBase = ComponentBase;
class Utils {
    static subscribeResize(handler) {
        let h = this.animationThrottled(handler);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }
    static subscribe(element, event, handler) {
        let h = this.animationThrottled(handler);
        element.addEventListener(event, h);
        return () => element.removeEventListener(event, h);
    }
    static animationThrottled(handler) {
        let running = false;
        return e => {
            if (!running) {
                running = true;
                requestAnimationFrame(function () {
                    handler(e);
                    running = false;
                });
            }
        };
    }
    ;
}
exports.Utils = Utils;
//# sourceMappingURL=utils.js.map