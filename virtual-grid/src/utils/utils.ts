import { OnDestroy } from "@angular/core";
import { Subscription as RxSubscription } from 'rxjs';

export type Subscription = () => void;
export type PropertySubscription<T> = (newValue? : T) => void;

export class Property<T> {
    private _value : T;
    private _subscriptions : PropertySubscription<T>[] = new Array();

    get value() : T {
        return this._value;
    }

    set value(newValue : T) {
        if (this._value != newValue) {
            this._value = newValue;
            for (var s of this._subscriptions) {
                s(newValue);
            }
        }
    }

    public onChanged(subscription : PropertySubscription<T>) : () => void {
        this._subscriptions.push(subscription);
        return () => {
            var index = this._subscriptions.indexOf(subscription);
            if (index >= 0) {
                this._subscriptions.splice(index);
            }
        };
    }
}

export class ComponentBase implements OnDestroy {

    private subscriptions : Subscription[] = new Array();

    protected anchor(subscription : Subscription) {
        this.subscriptions.push(subscription);
    }

    protected anchorx(subscription : RxSubscription) {
        this.subscriptions.push(subscription.unsubscribe);
    }

    public ngOnDestroy() : void {
        for (var s of this.subscriptions) {
            s();
        }
        this.subscriptions.splice(0, this.subscriptions.length);
    }
}

export class Utils {

    public static subscribeResize(handler : (event?:any) => void) : Subscription {
        let h = this.animationThrottled(handler);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }

    public static subscribe(element : HTMLElement, event : keyof HTMLElementEventMap, handler : (event?:any) => void) : Subscription {
        let h = this.animationThrottled(handler);
        element.addEventListener(event, h)
        return () => element.removeEventListener(event, h);
    }

    private static animationThrottled(handler : (event?:any) => void) : (event?:any) => void {
        let running = false;
        return e => {
            if (!running) {
                running = true;
                requestAnimationFrame(function() {
                    handler(e);
                    running = false;
                });
             }
        };
    };    
}