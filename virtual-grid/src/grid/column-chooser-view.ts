import * as utils from '../utils/utils';
import * as api from './contracts';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, ComponentFactoryResolver, ComponentFactory, ViewContainerRef, ComponentRef } from "@angular/core";
import { Column } from './column';

export class ColumnChooserEntry
{
    constructor(public readonly column : Column, private readonly parent : ColumnChooserView) {
    }

    get isVisible() {
        return this.parent.api.getColumnVisibility(this.column.def);
    }
    set isVisible(value : boolean) {
        this.parent.api.setColumnVisibility(this.column.def, value);
    }
}

@Component({
  selector: 'column-chooser',
  template: `
    <div class="column-chooser">
        <div *ngFor="let e of entries">
            <input type="checkbox" [(ngModel)]="e.isVisible">{{e.column.title}}
        </div>
    </div>`
})
export class ColumnChooserView extends utils.ComponentBase implements AfterViewInit {

    @Input() api : api.IGridApi;
    @Input() set columns(columns : Column[]) {
        this.entries = columns.map(x => new ColumnChooserEntry(x, this))
    }

    public entries : ColumnChooserEntry[];

    public ngAfterViewInit() : void {
    }
}