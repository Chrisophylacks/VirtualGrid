import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, Output } from "@angular/core";
import { ColumnDragService } from './column-drag-service';
import { ColumnChooserView } from './column-chooser-view';
import { Column } from './column';
import { MenuPopup } from './menu-popup';
import { IconFactory } from '../utils/icons';
import { Truncator } from '../utils/truncator';

import * as utils from '../utils/utils';
import * as api from './contracts';

@Component({
  selector: 'canvas-grid',
  template: `
    <div #grid class="grid" style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">
        <div style="width:100%" [style.height]="headerHeight" style="overflow:hidden">
            <div #header class="header" style="position:relative;height:100%">
                <column-header *ngFor="let col of visibleColumns" [column]="col" [iconFactory]="iconFactory" [columnDragService]="columnDragService" [menu]="menu" class="column-header-container"></column-header>
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

    public readonly columnDragService = new ColumnDragService();

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

    public setRowCount(rowCount : number) {
        this.updateLock.execute(() =>
        {
            this.rowCount.update(rowCount);
        });
    }

    public setColumns(columns : api.ColumnDefinition[]) : void {
        this.updateLock.execute(() =>
        {
            let columnChanges = new utils.CompositeSubscription();
            this.allColumns = columns.map(x =>
            {
                var col = new Column(x,  this._options.dataSource);
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
                        this.updateLock.execute(() => this.sort.setDirty());
                    }));

                columnChanges.add(
                    col.isVisible.onChanged(() => {
                        this.updateLock.execute(() => {

                            this.updateVisibleColumns();
                            this.updateTotalWidth();
                            this.changeDetectorRef.detectChanges();

                            if (col.filter && col.filter.isEnabled()) {
                                this._options.dataSource.requestFilter();
                            }
                            if (col.sortDirection.value !== api.SortDirection.None) {
                                this.sort.setDirty();
                            }
                        });
                    }));

                return col;
            });

            this.columnSubscription.set(columnChanges);
            this.updateVisibleColumns();
            this.changeDetectorRef.detectChanges();
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
                    this.rowCache.set(dataRow.index, dataRow.data);
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

    public showColumnChooser(origin : HTMLElement) : void {
        this.menu.show(ColumnChooserView, origin, x => { x.columns = this.allColumns; });
    }

    private updateVisibleColumns() : void {
        this.visibleColumns = this.allColumns.filter(x => x.isVisible.value);
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

        if (this.visibleRows.length === visibleRowCount) {
            return;
        }

        this.visibleRowsCount.update(visibleRowCount);

        // cache existing data
        for (let row of this.visibleRows) {
            let dataRow = row.value.data;
            if (dataRow !== undefined) {
                this.rowCache.set(dataRow.index, dataRow);
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
            this.visibleRows[i].update(this.rowCache.get(topIndex + i));
        }
    }

    private redraw() : void {
        let context = this.canvas.getContext('2d');
        let gridStyle = getComputedStyle(this.gridRef.nativeElement)
        context.font = gridStyle.font;
        let fitter = new Truncator(context);
        let textShift = this._options.rowHeight - (this._options.rowHeight - parseInt(gridStyle.fontSize));

        if (this.redrawAll) {
            context.clearRect(0, 0, this.viewportWidth.value, this.viewportHeight.value);
        }

        this.visibleRows.forEach((row, i) =>
        {
            if (row.isDirty || this.redrawAll) {
                let dataRow = row.value;
                row.clear();
                let background : string;
                if (i === this.hoverRowIndex) {
                    background = 'rgb(0,0,255)';
                } else {
                    let rowStyle : CSSStyleDeclaration;
                    if (this._options.rowAlternationMode !== undefined && this._options.rowAlternationMode !== api.RowAlternationMode.None) {
                        let alternationIndex = this._options.rowAlternationMode === api.RowAlternationMode.DataIndex
                            ? this.topRowIndex.value + i
                            : i;
                        rowStyle = getComputedStyle(alternationIndex % 2 == 0 ? this.rowEven.nativeElement : this.rowOdd.nativeElement);
                    }

                    if (rowStyle) {
                        background = rowStyle.backgroundColor;
                    }
                }

                let top = i * this._options.rowHeight;
                if (background) {
                    context.fillStyle = background;
                    context.fillRect(0, top, this.viewportWidth.value, this._options.rowHeight);
                }

                context.fillStyle = 'rgb(0,0,0)';
                let left = 0;
                for (let col of this.visibleColumns) {
                    let text = col.formatText(dataRow);
                    context.fillText(fitter.fitString(text, col.width.value - 2), left + 1.5, top + textShift);
                    left += col.width.value;
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