import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, Output } from "@angular/core";
import { HorizontalDragService } from '../utils/horizontaldragservice';
import { Column } from './column-header';
import { MenuPopup } from './menu-popup';
import { IconFactory } from '../utils/icons';

import * as utils from '../utils/utils';
import * as api from './contracts';

@Component({
  selector: 'canvas-grid',
  template: `
    <div #grid class="grid" style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">
        <div style="width:100%" [style.height]="headerHeight" style="overflow:hidden">
            <div #header class="header" style="position:relative;height:100%">
                <vcolumn-header *ngFor="let col of visibleColumns" [column]="col" [menu]="menu" class="column-header-container"></vcolumn-header>
            </div>
        </div>
        <menu-popup #menu></menu-popup>
        <div #viewport class="viewport" style="overflow-x:scroll;overflow-y:auto;white-space:nowrap;position:relative;flex:1 1;min-height:0px">
            <div class="fake-viewport" #fakeViewport style="position:absolute">
                <canvas #canvas style="position:absolute"></canvas>
            </div>
        </div>
        <div #rowEven class="row-even" style="display:none"></div>
        <div #rowOdd class="row-odd" style="display:none"></div>
    </div>`
})
export class CanvasGridComponent extends utils.ComponentBase implements AfterViewInit, OnDestroy, api.IGridApi {

    private visibleRows : RowHandle[] = new Array();

    private allColumns = Array.of<Column>();
    public visibleColumns = Array.of<Column>();

    private rowCount : number = 0;
    private topIndex : number = 0;
    private _options : api.GridOptions;
    private viewportWidth : number = 0;
    private viewportHeight : number = 0;
    private readonly columnSubscription = new utils.SerialSubscription();

    @ViewChild('grid') gridRef : ElementRef;
    private get grid() : HTMLElement { return <HTMLElement>this.gridRef.nativeElement; }

    @ViewChild('header') headerRef : ElementRef;
    private get header() : HTMLElement { return <HTMLElement>this.headerRef.nativeElement; }

    @ViewChild('viewport') viewportRef : ElementRef;
    private get viewport() : HTMLElement { return <HTMLElement>this.viewportRef.nativeElement; }

    @ViewChild('fakeViewport') fakeViewportRef : ElementRef;
    private get fakeViewport() : HTMLElement { return <HTMLElement>this.fakeViewportRef.nativeElement; }

    @ViewChild('canvas') canvasRef : ElementRef;
    private get canvas() : HTMLCanvasElement { return <HTMLCanvasElement>this.canvasRef.nativeElement; }

    @ViewChild('menu') menu : MenuPopup;
    @ViewChild('rowEven') rowEven : ElementRef;
    @ViewChild('rowOdd') rowOdd : ElementRef;

    @Input() set gridOptions(gridOptions : api.GridOptions) {
        this._options = gridOptions;
        this._options.api = this;
    }

    constructor(
        private readonly changeDetectorRef: ChangeDetectorRef) {
        super();
        this.anchor(this.columnSubscription);
    }

    public get headerHeight() : string {
        return this._options.rowHeight  + 'px';
    }

    public ngAfterViewInit() : void {
        utils.subscribe(this.viewport, 'scroll', () => this.onScroll());
        utils.subscribeResize(() => this.onResize());
        this.viewportWidth = this.viewport.clientWidth;

        this.onResize();
        this._options.dataSource.init(this);
    }

    public setRowCount(rowCount : number) {
        if (this.rowCount !== rowCount) {
            this.rowCount = rowCount;
            this.updateViewport();
            this.fakeViewport.style.height =  (this._options.rowHeight * (this.rowCount + 1) - 1) + 'px';
            this.raiseRangeChange();
        }
    }

    public setColumns(columns : api.ColumnDefinition[]) : void {
        let columnChanges = new utils.CompositeSubscription();
        this.allColumns = columns.map(x =>
        {
            var col = new Column(x, new IconFactory(this._options.icons), this._options.dataSource);
            columnChanges.add(
                col.width.onChanged(utils.animationThrottled(() => {
                    this.updateViewportSize();
                    this.redraw();
                })));

            columnChanges.add(
                col.sortDirection.onChanged(() => {
                    // this.invalidateAllRows(); // TODO: decide if this is necessary
                    this.raiseSortChange();
                }));

            columnChanges.add(
                col.isVisible.onChanged(() => {
                    this.updateVisibleColumns();
                    this.updateViewportSize();
                    this.changeDetectorRef.detectChanges();
                    if (col.filter && col.filter.isEnabled()) {
                        this._options.dataSource.requestFilter();
                    }
                    if (col.sortDirection.value !== api.SortDirection.None) {
                        this.raiseSortChange();
                    }
                    this.redraw()
                }));

            return col;
        });

        this.columnSubscription.set(columnChanges);
        this.updateVisibleColumns();
        this.updateViewport();
        this.updateViewportSize();
        this.changeDetectorRef.detectChanges();
        this.redraw();
    }

    public updateRows(rows : api.DataRow[]) {
        let maxIndex = this.topIndex + this.visibleRows.length - 1;
        for (let dataRow of rows) {
            let adjustedIndex = dataRow.index - this.topIndex;
            if (adjustedIndex >= 0 && adjustedIndex < this.visibleRows.length) {
                let row = this.visibleRows[adjustedIndex];
                row.dataRow = dataRow;
            }
        }
        this.redraw();
    }

    public buildFilterExpression<T>(builder : api.IExpressionBuilder<T>, defaultExpression :T) : T {
        let expr = defaultExpression;
        for (let col of this.visibleColumns) {
            if (col.filter && col.filter.isEnabled()){
                expr = builder.and(expr, col.filter.createFilterExpression(builder));
            }
        }
        return expr;
    }

    public setColumnVisibility(column: api.ColumnDefinition, visible : boolean) {
        let col = this.allColumns.find(x => x.def.field === column.field);
        if (col) {
            col.isVisible.value = visible;
        }
    }

    public getColumnVisibility(column: api.ColumnDefinition) : boolean {
        let col = this.allColumns.find(x => x.def.field === column.field);
        if (col) {
            return col.isVisible.value;
        }
        return undefined;
    }    

    public ngOnDestroy() {
        super.ngOnDestroy();
    }

    private onScroll() : void {
        let scrollLeft = this.viewport.scrollLeft;
        let scrollTop = this.viewport.scrollTop;
        this.updateViewport();
        this.redraw();
        this.raiseRangeChange();
        this.header.style.left = -scrollLeft + 'px';
        this.canvas.style.top = scrollTop + 'px';
    }

    private onResize() : void {
        this.updateViewport();
        this.updateViewportSize();
        this.redraw();
        this.raiseRangeChange();
    }

    private updateViewportSize() : void {
        let width = this.getTotalWidth() + 'px';
        this.viewportWidth = this.viewport.clientWidth;
        this.viewportHeight = this.viewport.clientHeight;
        this.canvas.width = this.viewportWidth;
        this.canvas.height = this.viewportHeight;
        this.header.style.width = width;
        this.fakeViewport.style.width = width;
    }

    private updateVisibleColumns() : void {
        this.visibleColumns = this.allColumns.filter(x => x.isVisible.value);
    }

    private updateViewport() : void {

        if (this.allColumns === undefined) {
            return;
        }

        var vOffset = this.viewport.scrollTop;
        var topIndex = Math.floor(vOffset / this._options.rowHeight);

        var maxVisibleRows = Math.ceil(this.viewport.clientHeight / this._options.rowHeight);
        var maxIndex = Math.min(topIndex + maxVisibleRows - 1, this.rowCount - 1);
        var visibleRowCount = maxIndex - topIndex + 1;

        if (this.topIndex === topIndex && this.visibleRows.length === visibleRowCount) {
            return;
        }

        this.topIndex = topIndex;

        // cache existing data
        var dataMap = new Map<number, api.DataRow>();
        for (let row of this.visibleRows) {
            if (row.dataRow !== undefined) {
                dataMap.set(row.dataRow.index, row.dataRow);
            }
        }

        // create/delete row handles
        if (this.visibleRows.length > visibleRowCount) {
            this.visibleRows.splice(visibleRowCount);
        }

        while (this.visibleRows.length < visibleRowCount) {
            this.visibleRows.push(<RowHandle>{ visibleIndex : this.visibleRows.length });
        }

        // update data and render
        for (let i = 0; i < visibleRowCount; ++i) {
            let cachedRow = dataMap.get(topIndex + i);
            if (cachedRow !== undefined) {
                this.visibleRows[i].dataRow = cachedRow;
            }
            else { 
                this.visibleRows[i].dataRow = undefined;
            }
        }
    }

    private redraw() : void {
        let context = this.canvas.getContext('2d');
        let gridStyle = getComputedStyle(this.gridRef.nativeElement)
        context.font = gridStyle.font;
        let top = 0;
        let fitter = new TextFitter(context);
        let textShift = this._options.rowHeight - (this._options.rowHeight - parseInt(gridStyle.fontSize));
        context.clearRect(0, 0, this.viewportWidth, this.viewportHeight)
        for (let row of this.visibleRows) {

            let rowStyle : CSSStyleDeclaration;
            if (this._options.rowAlternationMode !== undefined && this._options.rowAlternationMode !== api.RowAlternationMode.None) {
                let alternationIndex = this._options.rowAlternationMode === api.RowAlternationMode.DataIndex
                    ? this.topIndex + row.visibleIndex
                    : row.visibleIndex;
                rowStyle = getComputedStyle(alternationIndex % 2 == 0 ? this.rowEven.nativeElement : this.rowOdd.nativeElement);
            }

            if (rowStyle) {
                context.fillStyle = rowStyle.backgroundColor;
                context.fillRect(0, top, this.viewportWidth, this._options.rowHeight);
                context.fillStyle = 'rgb(0,0,0)';
            }

            let left = 0;
            for (let col of this.visibleColumns) {
                let text = col.formatText(row.dataRow);
                context.fillText(fitter.fitString(text, col.width.value - 2), left + 1.5, top + textShift);
                left += col.width.value;
            }
            top += this._options.rowHeight;
        }

        let left = 0;
        context.setLineDash([1, 1]);
        context.lineWidth = 1;
        context.strokeStyle = '#808080';
        for (let col of this.visibleColumns) {
            context.beginPath();
            context.moveTo(left + col.width.value - 0.5, 0);
            context.lineTo(left + col.width.value - 0.5, this.viewportHeight);
            context.stroke();
            left += col.width.value;
        }
        context.setLineDash([]);
    }

    private getTotalWidth() : number {
        var res : number = 0;
        if (this.visibleColumns) {
            for (var column of this.visibleColumns) {
                res += column.width.value;
            }
        }
        return res;
    }

    private raiseRangeChange() {
        this._options.dataSource.requestRange({ startIndex : this.topIndex, count : this.visibleRows.length });
    }

    private raiseSortChange() {
        this._options.dataSource.requestSort(
            this.visibleColumns
                .filter(c => c.sortDirection.value !== api.SortDirection.None)
                .map(c => <api.ColumnSort>{ column : c.def, sortDirection : c.sortDirection.value }));
    }
}

interface RowHandle {
    visibleIndex : number;
    dataRow? : api.DataRow;
}

class TextFitter {
    private readonly ellipsis : '…';
    private readonly ellipsisWidth : number;

    constructor(private readonly context : CanvasRenderingContext2D) {
        this.ellipsisWidth = context.measureText(this.ellipsis).width;
    }

    public fitString(str : string, maxWidth : number) : string {
        var width = this.context.measureText(str).width;
        if (width <= maxWidth) {
            return str;
        }
        if (width <= this.ellipsisWidth) {
            return '';
        }

        var len = str.length;
        while (width>=maxWidth-this.ellipsisWidth && len-->0) {
            str = str.substring(0, len);
            width = this.context.measureText(str).width;
        }
        return str + this.ellipsis;
    }    
}
