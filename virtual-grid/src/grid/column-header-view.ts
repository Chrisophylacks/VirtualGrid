import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, ComponentFactoryResolver, ComponentFactory, ViewContainerRef, ComponentRef } from "@angular/core";
import { HorizontalDragService } from '../utils/horizontaldragservice';
import { IMenuPopup } from './menu-popup';
import { IconFactory } from '../utils/icons';
import { Column } from './column';

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
export class ColumnHeaderView extends utils.ComponentBase implements AfterViewInit {
    @Input() menu : IMenuPopup;

    @Input() column : Column;

    @Input() iconFactory : IconFactory;

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
        (<HTMLElement>this.filterButtonRef.nativeElement).innerHTML = this.iconFactory.getIcon('filter');
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
