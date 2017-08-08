import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, ComponentFactoryResolver, ComponentFactory, ViewContainerRef, ComponentRef } from "@angular/core";
import { DragService } from '../utils/drag-service';
import { IColumnDragService } from './canvas-grid';
import { IMenuPopup } from './menu-popup';
import { IconFactory } from '../utils/icons';
import { Column } from './column';
import { ColumnDragService } from './column-drag-service';

@Component({
  selector: 'column-header',
  template: `
    <div class="column-header" [style.width]='currentWidth'>
        <div #resizeGrip class="resize-grip" style="float:right"></div>
        <div *ngIf="column.sortDirection.value == 1" style="float:left">▲</div>
        <div *ngIf="column.sortDirection.value == 2" style="float:left">▼</div>
        <div *ngIf="column.filter" #filterButton [class]="filterClass" (click)="filter()"></div>
        <div #dragGrip class="column-header-text" (click)="sort()">{{currentTitle}}</div>
    </div>`
})
export class ColumnHeaderView extends utils.ComponentBase implements AfterViewInit {
    @Input() menu : IMenuPopup;

    @Input() column : Column;

    @Input() iconFactory : IconFactory;

    @Input() columnDragService : IColumnDragService;

    @ViewChild('resizeGrip') resizeGripRef : ElementRef;
    private get resizeGrip() : HTMLElement { return <HTMLElement>this.resizeGripRef.nativeElement; }

    @ViewChild('dragGrip') dragGripRef : ElementRef;
    private get dragGrip() : HTMLElement { return <HTMLElement>this.dragGripRef.nativeElement; }

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
        if (this.filterButtonRef) {
            (<HTMLElement>this.filterButtonRef.nativeElement).innerHTML = this.iconFactory.getIcon('filter');
        }
        this.initResize();
        this.anchor(this.columnDragService.register(this.column, this.dragGrip));
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
            
            this.menu.show(
                this.column.filter.getViewComponentType(),
                this.filterButtonRef.nativeElement,
                c => { c.filter = this.column.filter; });
        }
    }

    private initResize() {
        if (!this.resizeGripRef) {
            return;
        }
        
        let dragStartWidth : number;
        this.anchor(DragService.addDragHandling(
            {
                eDraggableElement : this.resizeGrip,
                cursor : 'col-resize',
                startAfterPixels : 0,
                onDragStart : () => { dragStartWidth = this.column.width.value; },
                onDragging : (e, dx, dy, f) => { this.column.width.value = dragStartWidth + dx; },
            }));
    }
}
