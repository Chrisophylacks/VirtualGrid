import { OnDestroy, ComponentFactoryResolver, ComponentFactory, ComponentRef, ViewContainerRef } from "@angular/core";
import { Subscription as RxSubscription } from 'rxjs';

export interface Subscription {
    close();
}

export class SimpleSubscription {

}

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

    public onChanged(subscription : PropertySubscription<T>) : Subscription {
        this._subscriptions.push(subscription);
        return Utils.subscription(() => {
            var index = this._subscriptions.indexOf(subscription);
            if (index >= 0) {
                this._subscriptions.splice(index);
            }
        });
    }
}

export class ComponentBase implements OnDestroy {

    private subscriptions : CompositeSubscription = new CompositeSubscription();

    protected anchor(subscription : Subscription) {
        this.subscriptions.add(subscription);
    }

    public ngOnDestroy() : void {
        this.subscriptions.close();
    }
}

export class SerialSubscription {

    private isClosed : boolean;
    private current : Subscription;

    public set(subscription? : Subscription) {

        if (this.isClosed) {
            if (subscription !== undefined) {
                subscription.close();
            }
            return;
        }

        if (this.current !== undefined) {
            this.current.close();
        }
        this.current = subscription;
    }

    public close() {
        this.isClosed = true;
        if (this.current !== undefined) {
            this.current.close();
        }
    }
}

export class CompositeSubscription {

    private isClosed : boolean;
    private subscriptions : Subscription[];

    constructor(...subscriptions : Subscription[]) {
        this.subscriptions = subscriptions;
    }

    public add(subscription : Subscription) {
        if (this.isClosed) {
            subscription.close();
        }
        this.subscriptions.push(subscription);
    }

    public close() {
        this.isClosed = true;
        for (var s of this.subscriptions) {
            s.close();
        }
        this.subscriptions.slice();
    }
}

export class Utils {

    public static subscription(close : () => void) : Subscription {
        return { close : close }
    }

    public static subscribeResize(handler : (event?:any) => void) : Subscription {
        let h = this.animationThrottled(handler);
        window.addEventListener("resize", h);
        return this.subscription(() => window.removeEventListener("resize", h));
    }

    public static subscribe(element : HTMLElement, event : keyof HTMLElementEventMap, handler : (event?:any) => void) : Subscription {
        let h = this.animationThrottled(handler);
        element.addEventListener(event, h)
        return this.subscription(() => element.removeEventListener(event, h));
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