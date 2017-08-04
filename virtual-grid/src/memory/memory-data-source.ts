import * as api from '../grid/contracts';
import { Expression, MemoryExpressionBuilder } from './memory-expression-builder'

export class MemoryDataSource implements api.IGridDataSource {
    private expressionBuilder = new MemoryExpressionBuilder();

    private gridApi : api.IGridApi;
    private schema : api.ColumnDefinition[];

    private rawData : RawEntry[] = new Array();
    private viewportData : ViewportEntry[] = new Array();
    private lastViewport : ViewportEntry[] = new Array();
    private batchInProgress : boolean = false;

    private range : api.RowRange = { startIndex : 0, count : 0 };
    private sort : api.ColumnSort[] = new Array();
    private filterExpression : Expression;

    constructor() {
        this.filterExpression = this.expressionBuilder.default;
    }

    init(gridApi : api.IGridApi) : void {
        this.gridApi = gridApi;
        if (this.schema !== undefined) {
            this.gridApi.setColumns(this.schema);
        }
        if (this.viewportData !== undefined) {
            this.gridApi.setRowCount(this.viewportData.length);
        }
    }

    requestRange(range: api.RowRange) {
        this.range = range;
        this.updateGrid(false);
    }

    requestSort(sort: api.ColumnSort[]) {
        this.sort = sort;
        this.updateViewportData();
        this.updateGrid(true);
    }

    requestFilter() {
        this.filterExpression = this.gridApi.buildFilterExpression(this.expressionBuilder, this.expressionBuilder.default);
        this.updateViewportData();
        this.updateGrid(true);
    }

    setSchema(schema : api.ColumnDefinition[]) {
        this.schema = schema;
        if (this.gridApi !== undefined) {
            this.gridApi.setColumns(this.schema);
        }
    }

    refresh(data : any[]) {
        this.rawData = data.map((x, i) => <RawEntry>{ data : x, isDirty : true, index: i });
        if (!this.batchInProgress) {
            this.updateViewportData();
            this.updateGrid(false);
        }
    }

    beginBatch() : void {
        this.batchInProgress = true;
    }

    endBatch() : void {
        this.batchInProgress = false;
        this.updateIndexes();
        this.updateViewportData();
        this.updateGrid(true);
    }

    update(index : number, data : any) {
        if (this.rawData) {
            this.rawData[index] = <RawEntry>{ data : data, isDirty : true, index: index };
            if (!this.batchInProgress) {
                this.updateViewportData();
                this.updateGrid(true);
            }
        }
    }

    insert(index : number, data : any) {
        if (this.rawData) {
            this.rawData.splice(index, 0, <RawEntry>{ data : data, isDirty : true, index: index });
            if (!this.batchInProgress) {
                this.updateIndexes();
                this.updateViewportData();
                this.updateGrid(true);
            }
        }
    }    

    delete(index : number) {
        if (this.rawData) {
            this.rawData.splice(index, 1);
            if (!this.batchInProgress) {
                this.updateIndexes();
                this.updateViewportData();
                this.updateGrid(true);
            }
        }
    }

    private updateIndexes() : void {
        for (let i = 0; i < this.rawData.length; ++i) {
            this.rawData[i].index = i;
        }
    }

    private updateViewportData() : void{

        let oldRowCount = this.viewportData === undefined ? 0 : this.viewportData.length;
        this.viewportData = this.rawData
            .filter(r => this.filterExpression(r.data))
            .sort((x, y) =>
                {
                    if (this.sort !== undefined) {
                        for (var s of this.sort) {
                            var px = x.data[s.column.field];
                            var py = y.data[s.column.field];
                            if (px != py) {
                                var diff = px < py ? -1 : 1;
                                return s.sortDirection === api.SortDirection.Ascending ? diff : -diff;
                            }
                        }
                    }
                    return x.index < y.index ? -1 : 1;
                })
            .map((x, i) => <ViewportEntry>{ visualIndex : i, row : x });
        
        if (this.gridApi !== undefined && oldRowCount !== this.viewportData.length) {
            this.gridApi.setRowCount(this.viewportData.length);
        }
    }

    private updateGrid(checkLastViewport : boolean) : void {
        if (this.gridApi === undefined) {
            return;
        }

        let viewport = this.viewportData.slice(this.range.startIndex, this.range.startIndex + this.range.count);
        if (checkLastViewport && !this.needViewportUpdate(viewport)) {
            return;
        }

        for (let entry of viewport) {
            entry.row.isDirty = false;
        }
        this.lastViewport = viewport;

        this.gridApi.updateRows(viewport.map(x => <api.DataRow>{ index : x.visualIndex, data : x.row.data }));
    }

    private needViewportUpdate(viewport : ViewportEntry[]) : boolean {
        if (this.lastViewport.length !== viewport.length) {
            return true;
        }

        for (let i = 0; i < viewport.length; ++i) {
            if (this.lastViewport[i].row !== viewport[i].row || viewport[i].row.isDirty) {
                return true;
            }
        }

        return false;
    }
}

interface RawEntry {
    data : any;
    index : number;
    isDirty : boolean;
}

interface ViewportEntry {
    visualIndex : number;
    row : RawEntry;
}