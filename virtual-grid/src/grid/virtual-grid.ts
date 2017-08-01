import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import { HorizontalDragService } from '../utils/horizontaldragservice';
import { ComponentBase, Utils } from '../utils/utils';
import { Column } from './column-header';
import { Observable, BehaviorSubject } from 'rxjs';
import * as api from './contracts';

@Component({
  selector: 'virtual-grid',
  template: `
    <div #grid class="grid" style="width:100%;height:100%;display:flex;flex-direction:column">
        <div style="width:100%" [style.height]="headerHeight" style="overflow:hidden">
            <div #header class="header" style="position:relative;height:100%">
                <vcolumn-header [column]="col" *ngFor="let col of columns" style="height:100%;display:inline-block;vertical-align:top"></vcolumn-header>
            </div>
        </div>
        <div #viewport class="viewport" style="overflow-x:scroll;overflow-y:scroll;white-space:nowrap;position:relative;flex:1 1;min-height:0px">
            <div class="fake-viewport" #fakeViewport style="position:absolute">
                <div class="row-container" #rowContainer style="position:absolute"></div>
            </div>
        </div>
    </div>`
})
export class VirtualGridComponent extends ComponentBase implements AfterViewInit, OnDestroy, api.IGridApi {

    private visibleRows : RowHandle[] = new Array();

    public columns : Column[];

    private rowCount : number = 0;
    private topIndex : number = 0;
    private _options : api.GridOptions;

    private _rangeSubject : BehaviorSubject<api.RowRange> = new BehaviorSubject<api.RowRange>({ startIndex : 0, count : 0 });
    public get rangeChanges() : Observable<api.RowRange> {
        return this._rangeSubject;
    }

    private _sortSubject : BehaviorSubject<api.ColumnSort[]> = new BehaviorSubject<api.ColumnSort[]>(Array.of<api.ColumnSort>());
    public get sortChanges() : Observable<api.ColumnSort[]> {
        return this._sortSubject;
    }

    private _filterSubject : BehaviorSubject<api.ColumnFilter[]> = new BehaviorSubject<api.ColumnFilter[]>(Array.of<api.ColumnFilter>());
    public get filterChanges() : Observable<api.ColumnFilter[]> {
        return this._filterSubject;
    }

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

    @Input() set gridOptions(gridOptions : api.GridOptions) {
        this._options = gridOptions;
        this.columns = gridOptions.columns.map(x =>
        {
            var col = new Column(x);
            this.anchor(col.width.onChanged(() =>
            {
                this.updateViewportWidth();
                this.arrangeRows();
            }));
            this.anchor(col.sortDirection.onChanged(() =>
            {
                // this.invalidateAllRows(); // TODO: decide if this is necessary
                this.raiseSortChange();
            }));            
            return col;
        });

        this._options.api = this;
        if (this._options.onGridReady != null) {
            this._options.onGridReady();
        }        
    }

    public get headerHeight() : string {
        return this._options.rowHeight  + 'px';
    }

    public ngAfterViewInit() : void {
        Utils.subscribe(this.viewport, 'scroll', () => this.onScroll());
        Utils.subscribeResize(() => this.onResize());

        this.onResize();
    }

    public setRowCount(rowCount : number) {
        this.rowCount = rowCount;
        this.updateViewport();
        this.fakeViewport.style.height =  (this._options.rowHeight * (this.rowCount + 1) - 1) + 'px';
    }

    public update(rows : api.DataRow[]) {
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
        this.renderColumnHeaders();

        this.updateViewport();
        this.raiseRangeChange();
        this.updateViewportWidth();
    }

    private updateViewportWidth() : void {
        let width = this.getTotalWidth() + 'px';
        this.header.style.width = width;
        this.rowContainer.style.width = width;
        this.fakeViewport.style.width = width;
    }

    private renderColumnHeaders() : void {
        var offset = 0;
    }

    private updateViewport() : void {
        if (this.columns == null) {
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
            if (row.dataRow !== null) {
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
                this.visibleRows[i].dataRow = null;
            }
            this.renderRow(this.visibleRows[i]);
        }

        this.rowContainer.style.height = (visibleRowCount * this._options.rowHeight) + 'px';
    }

    private invalidateAllRows() : void {
        for (let row of this.visibleRows) {
            row.dataRow = null;
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

        for (let column of this.columns) {
            let cell = row.cells.get(column.def.field);
            if (cell === undefined) {
                continue;
            }

            //cell.nativeElement.innerText = column.formatText(row.dataRow);
            cell.textNode.textContent = column.formatText(row.dataRow);
            let cellClass = column.getClass(row.dataRow);
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
        var str = `<div class="row" style="height:${this._options.rowHeight}px;position:absolute;top:${visibleIndex*this._options.rowHeight}px">`;
        for (var column of this.columns) {
            str += `<div class="cell"></div>`;
        }
        str += '</div>';
        let element = this.createElement(str);

        let cells = new Map<string, CellHandle>();
        let cell = element.firstChild;
        for (var column of this.columns) {
            let textNode = document.createTextNode('');
            cell.appendChild(textNode);
            cells.set(column.def.field,
                {
                    lastClass : '',
                    nativeElement : <HTMLElement>cell,
                    textNode : textNode
                });
            cell = cell!.nextSibling;
        }

        var rowHandle = {
            dataRow : null,
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
        var cell = <HTMLElement>row.nativeElement.firstChild;
        for (var column of this.columns) {
            cell.style.width = column.width.value - 2 + 'px';
            cell.style.left = offset + 'px';
            offset += column.width.value;
            cell = <HTMLElement>cell.nextSibling;
        }
    }

    private createElement(html : string) : HTMLElement {
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return <HTMLElement>tempDiv.firstChild;
    }

    private getTotalWidth() : number {
        var res : number = 0;
        for (var column of this.columns) {
            res += (column.width.value + 2);
        }
        return res;
    }

    private raiseRangeChange() {
        this._rangeSubject.next({ startIndex : this.topIndex, count : this.visibleRows.length });
    }

    private raiseSortChange() {
        this._sortSubject.next(
            this.columns
                .filter(c => c.sortDirection.value !== api.SortDirection.None)
                .map(c => <api.ColumnSort>{ column : c.def, sortDirection : c.sortDirection.value }));
    }
}

interface RowHandle {
    lastClass : string;
    visibleIndex : number;
    dataRow : api.DataRow | null;
    nativeElement : HTMLElement;
    cells : Map<string, CellHandle>;
}

interface CellHandle {
    lastClass : string;
    nativeElement : HTMLElement;
    textNode : Node;
}
