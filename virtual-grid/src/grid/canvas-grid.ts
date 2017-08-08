import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, Output } from "@angular/core";
import { ColumnDragService } from './column-drag-service';
import { ColumnChooserView } from './column-chooser-view';
import { Column } from './column';
import { MenuPopup } from './menu-popup';
import { IconFactory } from '../utils/icons';
import { Truncator } from '../utils/truncator';
import { DragService } from '../utils/drag-service';

import * as utils from '../utils/utils';
import * as api from './contracts';

export interface IColumnDragService {
    register(column : Column, grip : HTMLElement) : utils.Subscription
}

@Component({
  selector: 'canvas-grid',
  template: `
    <div #grid class="grid" style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">
        <div style="width:100%" [style.height]="headerHeight" style="overflow:hidden">
            <div #header class="header" style="position:relative;height:100%">
                <column-header *ngFor="let col of visibleColumns" [column]="col" [iconFactory]="iconFactory" [columnDragService]="this" [menu]="menu" class="column-header-container"></column-header>
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
        <div #rowHover class="row-hover" style="display:none"></div>
    </div>`
})
export class CanvasGridComponent extends utils.ComponentBase implements AfterViewInit, OnDestroy, api.IGridApi, IColumnDragService {

    private visibleRows = Array.of<Dirtable<api.DataRow>>();
    private allColumns = Array.of<Column>();
    public visibleColumns = Array.of<Column>();
    private rowCache = new Map<number, api.DataRow>()

    private _options : api.GridOptions;

    private readonly columnSubscription = new utils.SerialSubscription();

    private readonly updateLock : utils.UpdateLock;

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
    @ViewChild('rowHover') rowHover : ElementRef;

    private dragMarker : HTMLElement
    private insertMarker : HTMLElement

    @Input() set gridOptions(gridOptions : api.GridOptions) {
        this._options = gridOptions;
        this._options.api = this;
    }

    public get headerHeight() : string {
        return this._options.rowHeight  + 'px';
    }

    public iconFactory = new IconFactory(() => {
        if (!this._options) {
            return undefined;
        }
        return this._options.icons;
    });

    private readonly dirtables = new DirtableContainer();
    private readonly viewportWidth = this.dirtables.register();
    private readonly viewportHeight = this.dirtables.register();
    private readonly topRowIndex = this.dirtables.register();
    private readonly rowCount = this.dirtables.register();
    private readonly visibleRowsCount = this.dirtables.register();
    private readonly viewportLeftOffset = this.dirtables.register();
    private readonly viewportTopOffset = this.dirtables.register();
    private readonly totalWidth = this.dirtables.register();
    private readonly sort = this.dirtables.register();
    private redrawAll = true;

    constructor(
        private readonly changeDetectorRef: ChangeDetectorRef) {
        super();
        this.anchor(this.columnSubscription);
        this.updateLock = new utils.UpdateLock(() => this.flushUpdates());
    }

    public ngAfterViewInit() : void {
        utils.subscribe(this.viewport, 'scroll', () => this.onScroll());
        utils.subscribe(this.canvas, 'mousemove', (e) => this.onMouseMove(e));
        utils.subscribe(this.canvas, 'mouseleave', () => this.onMouseLeave());
        utils.subscribeResize(() => this.onResize());

        this.updateLock.execute(() =>
        {
            this.onResize();
            this.onScroll();
            this._options.dataSource.init(this);
        });
    }

    public register(column : Column, grip : HTMLElement) : utils.Subscription {
        return DragService.addDragHandling(
            {
                eDraggableElement : grip,
                cursor : 'move',
                startAfterPixels : 2,
                onDragStart : () => this.onDrag(column),
                onDragging : (e, dx, dy, f) => this.onDragging(e, f, column),
            });
    }

    public setRowCount(rowCount : number) {
        this.updateLock.execute(() => {
            this.rowCount.update(rowCount);
        });
    }

    public setColumns(columns : api.ColumnDefinition[]) : void {
        this.updateLock.execute(() =>
        {
            let columnChanges = new utils.CompositeSubscription();
            this.allColumns = columns.map((x,i)=>
            {
                var col = new Column(x,  this._options.dataSource, i);
                columnChanges.add(
                    col.width.onChanged(utils.animationThrottled(() => {
                        this.updateLock.execute(() =>
                        {
                            this.updateTotalWidth();
                        })
                    })));

                columnChanges.add(
                    col.sortDirection.onChanged(() => {
                        // this.invalidateAllRows(); // TODO: decide if this is necessary
                        this.rowCache.clear();
                        this.updateLock.execute(() => this.sort.setDirty());
                    }));

                return col;
            });

            this.columnSubscription.set(columnChanges);
            this.updateVisibleColumns();
        });
    }

    public updateRows(rows : api.DataRow[]) {
        this.updateLock.execute(() =>
        {
            this.rowCache.clear();
            for (let dataRow of rows) {
                let adjustedIndex = dataRow.index - this.topRowIndex.value;
                if (adjustedIndex >= 0 && adjustedIndex < this.visibleRows.length) {
                    this.visibleRows[adjustedIndex].update(dataRow);
                } else {
                    this.rowCache.set(dataRow.index, dataRow);
                }
            }
        })
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

    public getColumnVisibility(column: api.ColumnDefinition) : boolean {
        return this.visibleColumns.find(x => x.def.field === column.field) !== undefined;
    }

    public setColumnVisibility(column: api.ColumnDefinition, visible : boolean) {
        let col = this.allColumns.find(x => x.def.field === column.field);
        if (col) {
            let isVisible = this.getColumnVisibility(column);
            if (isVisible !== visible) {
                this.updateLock.execute(() => {

                    col.isVisible = visible;

                    if (col.filter && col.filter.isEnabled()) {
                        this._options.dataSource.requestFilter();
                        this.rowCache.clear();
                    }
                    if (col.sortDirection.value !== api.SortDirection.None) {
                        this.sort.setDirty();
                    }

                    this.updateVisibleColumns();
                })
            }
        }
    }

    public showColumnChooser(origin : HTMLElement) : void {
        this.menu.show(ColumnChooserView, origin, x => { 
            x.columns = this.allColumns;
            x.api = this;
        });
    }

    private updateVisibleColumns() : void {
        this.visibleColumns = this.allColumns.filter(x => x.isVisible).sort((x,y) => x.order - y.order);
        this.updateTotalWidth();
        this.changeDetectorRef.detectChanges();        
        this.redrawAll = true;
    }

    private updateTotalWidth() : void {
        var totalWidth : number = 0;
        if (this.visibleColumns) {
            for (var column of this.visibleColumns) {
                totalWidth += column.width.value;
            }
        }
        this.totalWidth.update(totalWidth);
        this.redrawAll = true;
    }

    
    private onDrag(column : Column) : void {
        this.dragMarker = utils.createHtml(`<div style="width:auto;height:auto;background:white;position:fixed;border:1px solid black">${column.title}<div>`)
        this.insertMarker = utils.createHtml(`<div style="width:2px;height:${this._options.rowHeight + 2}px;background:gray;position:fixed"><div>`)
        document.body.appendChild(this.dragMarker);
        document.body.appendChild(this.insertMarker);
    }

    private onDragging(e: MouseEvent, finished : boolean, draggedColumn : Column) : void {
        let offset = this.viewportLeftOffset.value;

        let index = 0;
        for (;index < this.visibleColumns.length; ++index) {
            if (e.pageX >= offset && e.pageX < offset + this.visibleColumns[index].width.value) {
                break;
            }
            offset += this.visibleColumns[index].width.value;
        }
        
        if (finished) {
            this.dragMarker.remove();
            this.insertMarker.remove();
            let currentIndex = this.visibleColumns.indexOf(draggedColumn);
            if (currentIndex !== index && currentIndex !== index + 1 && currentIndex >= 0) {
                this.updateLock.execute(() => {
                    if (index >= this.visibleColumns.length) {
                        draggedColumn.order = this.visibleColumns[this.visibleColumns.length - 1].order + 1;
                    } else if (index <= 0) {
                        draggedColumn.order = this.visibleColumns[0].order - 1;
                    } else {
                        draggedColumn.order = (this.visibleColumns[index].order + this.visibleColumns[index - 1].order) / 2;
                    }
                    this.allColumns.sort((x,y) => x.order - y.order).forEach((x,i) => x.order = i);
                    this.updateVisibleColumns();
                });
            }
        } else {
            let viewportOffset = utils.getTotalOffset(this.viewport);
            this.dragMarker.style.left = e.pageX + 'px';
            this.dragMarker.style.top = e.pageY + 'px';
            this.insertMarker.style.left = (offset - 1) + 'px';
            this.insertMarker.style.top = (viewportOffset.y - this._options.rowHeight - 1) + 'px';
        }
    }

    private onScroll() : void {
        this.updateLock.execute(() =>
        {
            this.viewportLeftOffset.update(this.viewport.scrollLeft);
            this.viewportTopOffset.update(this.viewport.scrollTop);
            this.topRowIndex.update(Math.floor(this.viewport.scrollTop / this._options.rowHeight));
        }); 
    }

    private onResize() : void {
        this.updateLock.execute(() =>
        {
            this.viewportWidth.update(this.viewport.clientWidth);
            this.viewportHeight.update(this.viewport.clientHeight);
            this.redrawAll = true;
        });
    }

    private onMouseMove(e : MouseEvent) : void {
        this.updateLock.execute(() =>
        {
            this.updateHoverRow(Math.floor((e.pageY - utils.getTotalOffset(<HTMLElement>this.viewport).y) / this._options.rowHeight));
        });
    }

    private onMouseLeave() : void {
        this.updateLock.execute(() =>
        {
            this.updateHoverRow(undefined);
        });
    }

    private hoverRowIndex : number;

    private updateHoverRow(index : number) : void {
        let actualIndex = index < 0 || index > this.visibleRows.length ? undefined : index;
        if (this.hoverRowIndex !== actualIndex) {
            if (this.hoverRowIndex >= 0 && this.hoverRowIndex < this.visibleRows.length) {
                this.visibleRows[this.hoverRowIndex].setDirty();
            }
            if (actualIndex < this.visibleRows.length) {
                this.visibleRows[actualIndex].setDirty();
            }
            this.hoverRowIndex = actualIndex;
        }
    }

    private flushUpdates() : void {
        this.createVirtualRows();

        // raise data source events
        if (this.topRowIndex.isDirty || this.visibleRowsCount.isDirty) {
            this.topRowIndex.clear();
            this.visibleRowsCount.clear();
            this._options.dataSource.requestRange(<api.RowRange>{
                startIndex : this.topRowIndex.value,
                count : this.visibleRowsCount.value
            });
        }
        if (this.sort.isDirty) {
            this._options.dataSource.requestSort(
                this.visibleColumns
                    .filter(c => c.sortDirection.value !== api.SortDirection.None)
                    .map(c => <api.ColumnSort>{ column : c.def, sortDirection : c.sortDirection.value }));
        }

        // update element sizes and positions
        if (this.rowCount.isDirty) {
            this.fakeViewport.style.height = (this._options.rowHeight * (this.rowCount.value + 1) - 1) + 'px';
        }
        if (this.viewportTopOffset.isDirty) {
            this.canvas.style.top = this.viewportTopOffset.value + 'px';
        }
        if (this.viewportLeftOffset.isDirty) {
            this.header.style.left = -this.viewportLeftOffset.value + 'px';
        };
        if (this.totalWidth.isDirty) {
            this.header.style.width = this.totalWidth.value + 'px';
            this.fakeViewport.style.width = this.totalWidth.value + 'px';
        }

        // prepare canvas for drawing
        if (this.viewportWidth.isDirty) {
            this.canvas.width = this.viewportWidth.value;
        }

        if (this.viewportHeight.isDirty) {
            this.canvas.height = this.viewportHeight.value;
        }

        // draw
        if (this.redrawAll || this.visibleRows.find(x => x.isDirty)) {
            this.redraw();
        }

        this.dirtables.clear();
    }

    private createVirtualRows() : void {

        let visibleRowCount = this.visibleRows.length;

        if (this.topRowIndex.isDirty || this.viewportHeight.isDirty || this.rowCount.isDirty) {
            let maxVisibleRows = Math.ceil(this.viewportHeight.value / this._options.rowHeight);
            let maxIndex = Math.min(this.topRowIndex.value + maxVisibleRows - 1, this.rowCount.value - 1);
            visibleRowCount = maxIndex - this.topRowIndex.value + 1;
        }

        this.visibleRowsCount.update(visibleRowCount);
        let localRowCache = new Map<number, api.DataRow>();

        // cache existing data
        for (let row of this.visibleRows) {
            if (row.value) {
                localRowCache.set(row.value.index, row.value);
            }
        }

        // create/delete row handles
        if (this.visibleRows.length > visibleRowCount) {
            this.visibleRows.splice(visibleRowCount);
        }

        while (this.visibleRows.length < visibleRowCount) {
            this.visibleRows.push(new Dirtable<api.DataRow>());
        }

        // update data
        let topIndex = this.topRowIndex.value;
        for (let i = 0; i < visibleRowCount; ++i) {
            this.visibleRows[i].update(this.rowCache.get(topIndex + i) || localRowCache.get(topIndex + i));
        }
    }

    private redraw() : void {
        let context = this.canvas.getContext('2d');
        let gridStyle = getComputedStyle(this.gridRef.nativeElement)
        context.font = gridStyle.font;
        let truncator = new Truncator(context);
        let textShift = this._options.rowHeight - (this._options.rowHeight - parseInt(gridStyle.fontSize));

        if (this.redrawAll) {
            context.clearRect(0, 0, this.viewportWidth.value, this.viewportHeight.value);
        }

        const ellipsis = '…';
        let ellipsisWidth = context.measureText(ellipsis).width;

        this.visibleRows.forEach((row, i) =>
        {
            if (row.isDirty || this.redrawAll) {
                let dataRow = row.value;
                row.clear();
                let rowStyle = gridStyle;
                if (i === this.hoverRowIndex) {
                    rowStyle = getComputedStyle(this.rowHover.nativeElement);
                } else {
                    if (this._options.rowAlternationMode !== undefined && this._options.rowAlternationMode !== api.RowAlternationMode.None) {
                        let alternationIndex = this._options.rowAlternationMode === api.RowAlternationMode.DataIndex
                            ? this.topRowIndex.value + i
                            : i;
                        rowStyle = getComputedStyle(alternationIndex % 2 == 0 ? this.rowEven.nativeElement : this.rowOdd.nativeElement);
                    }
                }

                let top = i * this._options.rowHeight;
                context.fillStyle = rowStyle.backgroundColor;
                context.fillRect(0, top, this.viewportWidth.value, this._options.rowHeight);
                context.fillStyle = rowStyle.color;

                let left = 0;
                for (let col of this.visibleColumns) {
                    let text = col.formatText(dataRow);
                    if (text.length > 0) {
                        context.fillText(truncator.fitString(text, col.width.value - 2), left + 1.5, top + textShift);
                        /* alternative truncation. doesn't look very good and leads to drawing longer text
                        let colWidth = col.width.value - 2;
                        if (colWidth > ellipsisWidth) {
                            // optimize - assume text should occupy at least 4 pixels for symbol
                            if (text.length * 4 > colWidth) {
                                text = text.substring(0, Math.ceil(colWidth / 4));
                            }
                            let strWidth = context.measureText(text).width;
                            if (strWidth > colWidth) {
                                context.save();
                                context.rect(left + 1.5, top, colWidth - ellipsisWidth, this._options.rowHeight);
                                context.clip();
                                context.fillText(text, left + 1.5, top + textShift);
                                context.restore();
                                context.fillText(ellipsis, left + 1.5 + colWidth - ellipsisWidth, top + textShift);
                            } else {
                                context.fillText(text, left + 1.5, top + textShift, colWidth);
                            }
                        }
                        */
                        left += col.width.value;
                    }
                }
            }
        });

        this.redrawAll = false;

        let left = 0;
        context.setLineDash([1, 1]);
        context.lineWidth = 1;
        context.strokeStyle = '#808080';
        for (let col of this.visibleColumns) {
            context.beginPath();
            context.moveTo(left + col.width.value - 0.5, 0);
            context.lineTo(left + col.width.value - 0.5, this.viewportHeight.value);
            context.stroke();
            left += col.width.value;
        }
        context.setLineDash([]);
    }
}

class DirtableContainer {

    private dirtables = Array.of<Dirtable<number>>();

    public register() : Dirtable<number> {
        let d = new Dirtable<number>()
        this.dirtables.push(d);
        return d;
    }

    public clear() : void {
        for (let d of this.dirtables) {
            d.clear();
        }
    }
}

class Dirtable<T> {
    private _value : T;
    private _isDirty : boolean;
    private readonly comparer;

    public get isDirty() {
        return this._isDirty;
    }

    public get value() : T {
        return this._value;
    }

    public update(value : T) : void {
        if (this._value !== value) {
            this._value = value;
            this._isDirty = true;
        }
    }

    public setDirty() : void {
        this._isDirty = true;
    }

    public clear() : void {
        this._isDirty = false;
    }
}