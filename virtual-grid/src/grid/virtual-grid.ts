import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input, Output } from "@angular/core";
import { HorizontalDragService } from '../utils/horizontaldragservice';
import { Column } from './column-header';
import { MenuPopup } from './menu-popup';
import { IconFactory } from '../utils/icons';

import * as utils from '../utils/utils';
import * as api from './contracts';

@Component({
  selector: 'virtual-grid',
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
                <div class="row-container" #rowContainer style="position:absolute;width:100%"></div>
            </div>
        </div>
    </div>`
})
export class VirtualGridComponent extends utils.ComponentBase implements AfterViewInit, OnDestroy, api.IGridApi {

    private visibleRows : RowHandle[] = new Array();

    private allColumns : Column[];
    public visibleColumns : Column[];

    private rowCount : number = 0;
    private topIndex : number = 0;
    private _options : api.GridOptions;
    private readonly columnSubscription = new utils.SerialSubscription();

    @ViewChild('grid') gridRef : ElementRef;
    private get grid() : HTMLElement { return <HTMLElement>this.gridRef.nativeElement; }

    @ViewChild('header') headerRef : ElementRef;
    private get header() : HTMLElement { return <HTMLElement>this.headerRef.nativeElement; }

    @ViewChild('viewport') viewportRef : ElementRef;
    private get viewport() : HTMLElement { return <HTMLElement>this.viewportRef.nativeElement; }

    @ViewChild('fakeViewport') fakeViewportRef : ElementRef;
    private get fakeViewport() : HTMLElement { return <HTMLElement>this.fakeViewportRef.nativeElement; }

    @ViewChild('rowContainer') rowContainerRef : ElementRef;
    private get rowContainer() : HTMLElement { return <HTMLElement>this.rowContainerRef.nativeElement; }

    @ViewChild('menu') menu : MenuPopup;

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
                col.width.onChanged(() => {
                    this.updateViewportWidth();
                    this.arrangeRows();
                }));

            columnChanges.add(
                col.sortDirection.onChanged(() => {
                    // this.invalidateAllRows(); // TODO: decide if this is necessary
                    this.raiseSortChange();
                }));

            columnChanges.add(
                col.isVisible.onChanged(() => {
                    this.updateVisibleColumns();
                    this.arrangeRows();
                    this.updateViewportWidth();
                    this.changeDetectorRef.detectChanges();
                    if (col.filter && col.filter.isEnabled()) {
                        this._options.dataSource.requestFilter();
                    }
                    if (col.sortDirection.value !== api.SortDirection.None) {
                        this.raiseSortChange();
                    }
                }));

            return col;
        });

        this.columnSubscription.set(columnChanges);
        this.updateVisibleColumns();
        this.updateViewport();

        this.updateViewportWidth();
        this.changeDetectorRef.detectChanges();
    }

    public updateRows(rows : api.DataRow[]) {
        let maxIndex = this.topIndex + this.visibleRows.length - 1;
        for (let dataRow of rows) {
            let adjustedIndex = dataRow.index - this.topIndex;
            if (adjustedIndex >= 0 && adjustedIndex < this.visibleRows.length) {
                let row = this.visibleRows[adjustedIndex];
                row.dataRow = dataRow;
                this.renderRow(row);
            }
        }
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
        let scrolLeft = this.viewport.scrollLeft;
        let scrollTop = this.viewport.scrollTop;
        this.updateViewport();
        this.raiseRangeChange();
        this.header.style.left = -scrolLeft + 'px';
        this.rowContainer.style.top = scrollTop + 'px';
    }

    private onResize() : void {
        this.updateViewport();
        this.raiseRangeChange();
        this.updateViewportWidth();
    }

    private updateViewportWidth() : void {
        let width = this.getTotalWidth() + 'px';
        this.header.style.width = width;
        this.fakeViewport.style.width = width;
    }

    private updateVisibleColumns() : void {
        this.visibleColumns = this.allColumns.filter(x => x.isVisible.value);
        for (let row of this.visibleRows) {
            for (let col of this.allColumns) {
                let cell = row.cells.get(col.def.field);
                if (col.isVisible.value && !cell.isIncluded) {
                    row.nativeElement.appendChild(cell.nativeElement);
                    cell.isIncluded = true;
                } else if (!col.isVisible.value && cell.isIncluded) {
                    cell.nativeElement.remove();
                    cell.isIncluded = false;
                }
            }
        }
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
            for (let row of this.visibleRows.splice(visibleRowCount)) {
                this.deleteRow(row);
            }
        }

        while (this.visibleRows.length < visibleRowCount) {
            this.visibleRows.push(this.createRowHandle(this.visibleRows.length));
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
            this.renderRow(this.visibleRows[i]);
        }

        this.rowContainer.style.height = (visibleRowCount * this._options.rowHeight) + 'px';
    }

    private invalidateAllRows() : void {
        for (let row of this.visibleRows) {
            row.dataRow = undefined;
            this.renderRow(row);
        }
    }

    private arrangeRows() : void {
        for (var row of this.visibleRows) {
            this.arrangeRow(row);
        }
    }
    
    private deleteRow(row : RowHandle) {
        (<HTMLElement>this.rowContainer).removeChild(row.nativeElement);
    }

    private renderRow(row : RowHandle) {
        let rowClass = '';
        if (this._options.rowAlternationMode !== undefined && this._options.rowAlternationMode !== api.RowAlternationMode.None) {
            let alternationIndex = this._options.rowAlternationMode === api.RowAlternationMode.DataIndex
                ? this.topIndex + row.visibleIndex
                : row.visibleIndex;
            rowClass = alternationIndex % 2 == 0 ? 'row-even' : 'row-odd';
        }

        if (row.lastClass != rowClass) {
            if (row.lastClass != '') {
                row.nativeElement.classList.remove(row.lastClass);
            }
            row.lastClass = rowClass;
            row.nativeElement.classList.add(row.lastClass = rowClass);
        }

        for (let column of this.allColumns) {
            let cell = row.cells.get(column.def.field);
            if (cell === undefined) {
                continue;
            }

            //cell.nativeElement.innerText = column.formatText(row.dataRow);
            cell.textNode.textContent = column.formatText(row.dataRow);
            let cellClass = column.getClass(row.dataRow) || '';
            if (cellClass !== cell.lastClass) {
                if (cell.lastClass != '') {
                    cell.nativeElement.classList.remove(cell.lastClass);
                }
                cell.lastClass = cellClass;
                if (cell.lastClass != '') {
                    cell.nativeElement.classList.add(cellClass);
                }
            }
        }
    }

    private createRowHandle(visibleIndex : number) {
        let element = this.createElement(`<div class="row" style="height:${this._options.rowHeight}px;position:absolute;top:${visibleIndex*this._options.rowHeight}px;width:100%"></div>`);

        let cells = new Map<string, CellHandle>();
        for (var column of this.allColumns) {
            let cell = <HTMLElement>document.createElement("div");
            cell.classList.add('cell');
            let textNode = document.createTextNode('');
            cell.appendChild(textNode);

            if (column.isVisible.value) {
                element.appendChild(cell);
            }

            cells.set(column.def.field,
                {
                    lastClass : '',
                    nativeElement : <HTMLElement>cell,
                    textNode : textNode,
                    isIncluded : column.isVisible.value
                });
        }

        var rowHandle = {
            nativeElement : element,
            cells : cells,
            lastClass : '',
            visibleIndex : visibleIndex
        };
        this.arrangeRow(rowHandle);
        (<HTMLElement>this.rowContainer).appendChild(rowHandle.nativeElement);
        return rowHandle;
    }

    private arrangeRow(row : RowHandle) {
        var offset = 0;
        for (var column of this.visibleColumns) {
            let cell = row.cells.get(column.def.field).nativeElement;
            cell.style.width = column.width.value + 'px';
            cell.style.left = offset + 'px';
            offset += column.width.value;
        }
    }

    private createElement(html : string) : HTMLElement {
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return <HTMLElement>tempDiv.firstChild;
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
    lastClass : string;
    visibleIndex : number;
    dataRow? : api.DataRow;
    nativeElement : HTMLElement;
    cells : Map<string, CellHandle>;
}

interface CellHandle {
    lastClass : string;
    nativeElement : HTMLElement;
    textNode : Node;
    isIncluded : boolean;
}
