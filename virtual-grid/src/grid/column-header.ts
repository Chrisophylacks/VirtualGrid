import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, ComponentFactoryResolver, ComponentFactory, ViewContainerRef, ComponentRef } from "@angular/core";
import { HorizontalDragService } from '../utils/horizontaldragservice';
import { ComponentBase, Utils, Property } from '../utils/utils';
import * as api from './contracts';

export class Column {
    public width : Property<number> = new Property<number>();
    public sortDirection : Property<api.SortDirection> = new Property<api.SortDirection>();

    constructor(public readonly def :api. ColumnDefinition) {
        this.width.value = (def.width || 100);
        this.sortDirection.value = api.SortDirection.None;
    }

    get title() : string {
        return this.def.title || this.def.field;
    }

    public formatText(rowData? : api.DataRow) : string {
        if (rowData === undefined) { 
            return '...';
        }
        if (this.def.formatText != null) {
            return this.def.formatText(rowData.data);
        }

        let fieldValue =  rowData.data[this.def.field];
        if (fieldValue === undefined) {
            return '';
        }
        return fieldValue.toString();
    }

    public getClass(rowData : api.DataRow) : string {
        if (rowData !== undefined && this.def.formatCss != null) {
            return this.def.formatCss(rowData.data);
        }
        return '';
    }
}

@Component({
  selector: 'vcolumn-header',
  template: `
    <div class="column-header" (click)="sort()" [style.width]='currentWidth'>
        <div #resizeGrip class="resize-grip" style="float:right" (click)="suppress($event)"></div>
        <div *ngIf="column.sortDirection.value == 1" style="float:left">^</div>
        <div *ngIf="column.sortDirection.value == 2" style="float:left">V</div>
        <!--<button style="float:left" (click)="filter()">F</button>-->
        <div class="column-header-text">{{currentTitle}}</div>
    </div>`
})
export class ColumnHeader extends ComponentBase implements AfterViewInit {
    private _column : Column
    //private _filterComponent : api.IFilter;

    @Input()
    public get column() : Column {
        return this._column;
    }

    public set column(column : Column) {
        this._column = column;
    }

    @ViewChild('resizeGrip') resizeGripRef : ElementRef;
    private get resizeGrip() : HTMLElement { return <HTMLElement>this.resizeGripRef.nativeElement; }

    constructor(
        private componentFactoryResolver : ComponentFactoryResolver,
        private viewContainerRef : ViewContainerRef) {
        super();
    }

    public get currentWidth() {
        if (!this.column) {
            return '0px';
        }

        return this.column.width.value + 'px';
    }

    public get currentTitle() {
        if (!this.column) {
            return '';
        }
        
        return this.column.title;
    }    

    public ngAfterViewInit() : void {
        this.initResize();
    }

    public suppress(e : Event) {
        e.stopPropagation();
    }

    public sort() : void {
        switch (this._column.sortDirection.value) {
            case api.SortDirection.None: {
                this._column.sortDirection.value = api.SortDirection.Ascending;
                break;
            }
            case api.SortDirection.Ascending: {
                this._column.sortDirection.value = api.SortDirection.Descending;
                break;
            }
            case api.SortDirection.Descending: {
                this._column.sortDirection.value = api.SortDirection.None;
                break;
            }
        }
    }

    public filter() {
        /*
        if (this._column.def.filterComponent !== undefined) {
            let factory = this.componentFactoryResolver.resolveComponentFactory<api.IFilter>(this._column.def.filterComponent);
            let component = this.viewContainerRef.createComponent<api.IFilter>(factory);
        }*/
    }

    private initResize() {
        if (!this.resizeGripRef) {
            return;
        }
        
        this.anchor(HorizontalDragService.addDragHandling(
            {
                eDraggableElement : this.resizeGrip,
                cursor : 'col-resize',
                startAfterPixels : 0,
                onDragStart : () => this.onDragStart(),
                onDragging : (d, f) => this.onDragging(d, f),
            }));
    }

    private dragStartWidth : number;

    private onDragStart() : void {
        this.dragStartWidth = this.column.width.value;
    }

    private onDragging(delta: number, finished: boolean) : void {
        this.column.width.value = this.dragStartWidth + delta;
    }    
}
