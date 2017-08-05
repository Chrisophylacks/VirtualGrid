import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, ComponentFactoryResolver, ComponentFactory, ViewContainerRef, ComponentRef } from "@angular/core";
import { HorizontalDragService } from '../utils/horizontaldragservice';
import { IMenuPopup } from './menu-popup';
import { IconFactory } from '../utils/icons';
import * as api from './contracts';

export class Column {
    public width : utils.Property<number>;
    public isVisible : utils.Property<boolean>;
    public sortDirection : utils.Property<api.SortDirection>;
    public filter : api.IFilter | undefined;

    constructor(
        public readonly def : api. ColumnDefinition,
        public readonly iconFactory : IconFactory,
        dataSource : api.IGridDataSource
        ) {
        this.width = new utils.Property<number>(def.width || 100);
        this.isVisible = new utils.Property<boolean>(true);
        this.sortDirection = new utils.Property<number>(api.SortDirection.None);
        if (def.filterFactory) {
            this.filter = def.filterFactory(
                {
                    dataSource : dataSource,
                    column : def
                });
        }
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

    public flipSorting() {
        switch (this.sortDirection.value) {
            case api.SortDirection.None: {
                this.sortDirection.value = api.SortDirection.Ascending;
                break;
            }
            case api.SortDirection.Ascending: {
                this.sortDirection.value = api.SortDirection.Descending;
                break;
            }
            case api.SortDirection.Descending: {
                this.sortDirection.value = api.SortDirection.None;
                break;
            }
        }
    }
}

@Component({
  selector: 'vcolumn-header',
  template: `
    <div class="column-header" [style.width]='currentWidth'>
        <div #resizeGrip class="resize-grip" style="float:right"></div>
        <div *ngIf="column.sortDirection.value == 1" style="float:left">▲</div>
        <div *ngIf="column.sortDirection.value == 2" style="float:left">▼</div>
        <div *ngIf="column.filter" cl #filterButton [class]="filterClass" (click)="filter()"></div>
        <div class="column-header-text" (click)="sort()">{{currentTitle}}</div>
    </div>`
})
export class ColumnHeader extends utils.ComponentBase implements AfterViewInit {
    @Input() menu : IMenuPopup;

    @Input() column : Column;

    @ViewChild('resizeGrip') resizeGripRef : ElementRef;
    private get resizeGrip() : HTMLElement { return <HTMLElement>this.resizeGripRef.nativeElement; }

    @ViewChild('filterButton') filterButtonRef : ElementRef;

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

    public get filterClass() {
        if (!this.column.filter) {
            return '';
        }
        return this.column.filter.isEnabled() ? 'filter' : 'filter filter-inactive';
    }
    public ngAfterViewInit() : void {
        (<HTMLElement>this.filterButtonRef.nativeElement).innerHTML = this.column.iconFactory.getIcon('filter');
        this.initResize();
    }

    public suppress(e : Event) {
        e.stopPropagation();
    }

    public sort() : void {
        this.column.flipSorting();
    }

    public filter() {
        if (this.column.filter !== undefined) {
            if (this.column.filter.prepareForView) {
                this.column.filter.prepareForView();
            }
            
            let origin = this.filterButtonRef.nativeElement;
            this.menu.show(
                this.column.filter.getViewComponentType(),
                origin.offsetLeft + origin.offsetParent.offsetLeft,
                c => { c.filter = this.column.filter; });
        }
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
