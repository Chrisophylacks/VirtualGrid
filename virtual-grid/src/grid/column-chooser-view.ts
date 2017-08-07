import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, ComponentFactoryResolver, ComponentFactory, ViewContainerRef, ComponentRef } from "@angular/core";
import { Column } from './column';

@Component({
  selector: 'column-chooser',
  template: `
    <div class="column-chooser">
        <div *ngFor="let col of columns">
            <input type="checkbox" [(ngModel)]="col.isVisible.value">{{col.title}}
        </div>
    </div>`
})
export class ColumnChooserView extends utils.ComponentBase implements AfterViewInit {
    @Input() columns : Column[];

    public ngAfterViewInit() : void {
    }
}