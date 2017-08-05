export interface Subscription {
    close();
}

export class SimpleSubscription {

}

export type PropertySubscription<T> = (newValue? : T) => void;

export class Property<T> {
    private _value : T;
    private _subscriptions : PropertySubscription<T>[] = new Array();

    constructor(value : T) {
        this._value = value;
    }

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

    public onChanged(s : PropertySubscription<T>) : Subscription {
        this._subscriptions.push(s);
        return subscription(() => {
            var index = this._subscriptions.indexOf(s);
            if (index >= 0) {
                this._subscriptions.splice(index);
            }
        });
    }
}

export class ComponentBase {

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

    constructor(subscriptions? : Subscription[]) {
        this.subscriptions = subscriptions || Array.of<Subscription>();
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

export function subscription(close : () => void) : Subscription {
    return { close : close }
}

export function subscribeResize(handler : (event?:any) => void) : Subscription {
    let h = this.animationThrottled(handler);
    window.addEventListener("resize", h);
    return this.subscription(() => window.removeEventListener("resize", h));
}

export function subscribe(element : HTMLElement, event : keyof HTMLElementEventMap, handler : (event?:any) => void) : Subscription {
    let h = this.animationThrottled(handler);
    element.addEventListener(event, h)
    return this.subscription(() => element.removeEventListener(event, h));
}

export function throttled<T>(callback : (arg:T) => void, throttleTime : number) : (arg:T) => void {
    let currentToken : any;

    return arg => {
        let token = { };
        currentToken = token;

        if (throttleTime) {
            setTimeout(() => {
                if (token === currentToken) {
                    callback(arg);
                }
            }, throttleTime);
        }
    }
}

export function controlledThrottled<T>(callback : (arg:T) => void) : (arg:T, throttleTime? : number) => void {
    let currentToken : any;

    return (arg, throttleTime) => {
        let token = { };
        currentToken = token;

        if (throttleTime) {
            setTimeout(() => {
                if (token === currentToken) {
                    callback(arg);
                }
            }, throttleTime);
        }
        else {
            callback(arg);
        }
    }
}    

export function animationThrottled(handler : (event?:any) => void) : (event?:any) => void {
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

export function createStyle(name) : any {
    var style = document.createElement('style');
    style.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(style);
    return style.sheet;
    //(<any>style.sheet).insertRule(name+"{"+rules+"}",0);
}
