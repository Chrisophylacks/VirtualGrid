"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular/core");
const utils_1 = require("../utils/utils");
const column_header_1 = require("./column-header");
const rxjs_1 = require("rxjs");
const api = require("./contracts");
let VirtualGridComponent = class VirtualGridComponent extends utils_1.ComponentBase {
    constructor() {
        super(...arguments);
        this.visibleRows = new Array();
        this.rowCount = 0;
        this.topIndex = 0;
        this._rangeSubject = new rxjs_1.BehaviorSubject({ startIndex: 0, count: 0 });
        this._sortSubject = new rxjs_1.BehaviorSubject(Array.of());
        this._filterSubject = new rxjs_1.BehaviorSubject(Array.of());
    }
    get rangeChanges() {
        return this._rangeSubject;
    }
    get sortChanges() {
        return this._sortSubject;
    }
    get filterChanges() {
        return this._filterSubject;
    }
    get grid() { return this.gridRef.nativeElement; }
    get header() { return this.headerRef.nativeElement; }
    get viewport() { return this.viewportRef.nativeElement; }
    get fakeViewport() { return this.fakeViewportRef.nativeElement; }
    get rowContainer() { return this.rowContainerRef.nativeElement; }
    set gridOptions(gridOptions) {
        this._options = gridOptions;
        this.columns = gridOptions.columns.map(x => {
            var col = new column_header_1.Column(x);
            this.anchor(col.width.onChanged(() => {
                this.updateViewportWidth();
                this.arrangeRows();
            }));
            this.anchor(col.sortDirection.onChanged(() => {
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
    get headerHeight() {
        return this._options.rowHeight + 'px';
    }
    ngAfterViewInit() {
        utils_1.Utils.subscribe(this.viewport, 'scroll', () => this.onScroll());
        utils_1.Utils.subscribeResize(() => this.onResize());
        this.onResize();
    }
    setRowCount(rowCount) {
        this.rowCount = rowCount;
        this.updateViewport();
        this.fakeViewport.style.height = (this._options.rowHeight * (this.rowCount + 1) - 1) + 'px';
    }
    update(rows) {
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
    ngOnDestroy() {
        super.ngOnDestroy();
    }
    onScroll() {
        let scrolLeft = this.viewport.scrollLeft;
        let scrollTop = this.viewport.scrollTop;
        this.updateViewport();
        this.raiseRangeChange();
        this.header.style.left = -scrolLeft + 'px';
        this.rowContainer.style.top = scrollTop + 'px';
    }
    onResize() {
        this.renderColumnHeaders();
        this.updateViewport();
        this.raiseRangeChange();
        this.updateViewportWidth();
    }
    updateViewportWidth() {
        let width = this.getTotalWidth() + 'px';
        this.header.style.width = width;
        this.rowContainer.style.width = width;
        this.fakeViewport.style.width = width;
    }
    renderColumnHeaders() {
        var offset = 0;
    }
    updateViewport() {
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
        var dataMap = new Map();
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
    invalidateAllRows() {
        for (let row of this.visibleRows) {
            row.dataRow = null;
            this.renderRow(row);
        }
    }
    arrangeRows() {
        for (var row of this.visibleRows) {
            this.arrangeRow(row);
        }
    }
    deleteRow(row) {
        this.rowContainer.removeChild(row.nativeElement);
    }
    renderRow(row) {
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
    createRowHandle(visibleIndex) {
        var str = `<div class="row" style="height:${this._options.rowHeight}px;position:absolute;top:${visibleIndex * this._options.rowHeight}px">`;
        for (var column of this.columns) {
            str += `<div class="cell"></div>`;
        }
        str += '</div>';
        let element = this.createElement(str);
        let cells = new Map();
        let cell = element.firstChild;
        for (var column of this.columns) {
            let textNode = document.createTextNode('');
            cell.appendChild(textNode);
            cells.set(column.def.field, {
                lastClass: '',
                nativeElement: cell,
                textNode: textNode
            });
            cell = cell.nextSibling;
        }
        var rowHandle = {
            dataRow: null,
            nativeElement: element,
            cells: cells,
            lastClass: '',
            visibleIndex: visibleIndex
        };
        this.arrangeRow(rowHandle);
        this.rowContainer.appendChild(rowHandle.nativeElement);
        return rowHandle;
    }
    arrangeRow(row) {
        var offset = 0;
        var cell = row.nativeElement.firstChild;
        for (var column of this.columns) {
            cell.style.width = column.width.value - 2 + 'px';
            cell.style.left = offset + 'px';
            offset += column.width.value;
            cell = cell.nextSibling;
        }
    }
    createElement(html) {
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.firstChild;
    }
    getTotalWidth() {
        var res = 0;
        for (var column of this.columns) {
            res += (column.width.value + 2);
        }
        return res;
    }
    raiseRangeChange() {
        this._rangeSubject.next({ startIndex: this.topIndex, count: this.visibleRows.length });
    }
    raiseSortChange() {
        this._sortSubject.next(this.columns
            .filter(c => c.sortDirection.value !== api.SortDirection.None)
            .map(c => ({ column: c.def, sortDirection: c.sortDirection.value })));
    }
};
__decorate([
    core_1.ViewChild('grid'),
    __metadata("design:type", core_1.ElementRef)
], VirtualGridComponent.prototype, "gridRef", void 0);
__decorate([
    core_1.ViewChild('header'),
    __metadata("design:type", core_1.ElementRef)
], VirtualGridComponent.prototype, "headerRef", void 0);
__decorate([
    core_1.ViewChild('viewport'),
    __metadata("design:type", core_1.ElementRef)
], VirtualGridComponent.prototype, "viewportRef", void 0);
__decorate([
    core_1.ViewChild('fakeViewport'),
    __metadata("design:type", core_1.ElementRef)
], VirtualGridComponent.prototype, "fakeViewportRef", void 0);
__decorate([
    core_1.ViewChild('rowContainer'),
    __metadata("design:type", core_1.ElementRef)
], VirtualGridComponent.prototype, "rowContainerRef", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], VirtualGridComponent.prototype, "gridOptions", null);
VirtualGridComponent = __decorate([
    core_1.Component({
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
], VirtualGridComponent);
exports.VirtualGridComponent = VirtualGridComponent;
//# sourceMappingURL=component.js.map