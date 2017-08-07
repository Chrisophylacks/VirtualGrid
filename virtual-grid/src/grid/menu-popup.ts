import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, ComponentFactoryResolver, ComponentFactory, ViewContainerRef, ComponentRef } from "@angular/core";

export interface IMenuPopup {
    show<T>(componentType : any, origin : HTMLElement, setInputs? : (any) => void) : void;
}

@Component({
  selector: 'menu-popup',
  template: `<div style="display:hidden"></div>`
})
export class MenuPopup extends utils.ComponentBase implements IMenuPopup {

    constructor(
        private readonly componentFactoryResolver : ComponentFactoryResolver,
        private readonly viewContainerRef : ViewContainerRef) {
        super();
    }

    public show(componentType : any, origin : HTMLElement, setInputs? : (any) => void) : void {
        setTimeout(() =>
        {
            let factory = this.componentFactoryResolver.resolveComponentFactory(componentType);
            let component = this.viewContainerRef.createComponent(factory);
            if (setInputs) {
                setInputs(component.instance);
            }

            let offset = utils.getTotalOffset(origin);
            let selfOffset = utils.getTotalOffset(this.viewContainerRef.element.nativeElement);
            component.location.nativeElement.style.position = 'relative';
            component.location.nativeElement.style.left = (offset.x - selfOffset.x) + 'px';
            component.location.nativeElement.style.top = (offset.y - selfOffset.y + origin.offsetHeight) + 'px';

            let subscriptions : utils.CompositeSubscription;
            let childEvent : any;

            let suppressHide = e => { 
                childEvent = e;
            };

            let hide = e => {
                if (e && e === childEvent) {
                    return;
                }
                subscriptions.close();
                component.destroy();
            }

            let body = document.body;
            subscriptions = new utils.CompositeSubscription([
                utils.subscribe(body, 'click', hide),
                utils.subscribe(body, 'contextmenu', hide),
                utils.subscribe(component.location.nativeElement, 'click', suppressHide)
            ]);
        }, 0);
    }
}