import * as api from '../grid/contracts';

export class MemoryDataSource implements api.IGridDataSource {
    private gridApi : api.IGridApi;
    private schema : api.ColumnDefinition[];
    private data : api.DataRow[];

    private range : api.RowRange;
    private sort : api.ColumnSort[];

    init(gridApi : api.IGridApi) : void {
        this.gridApi = gridApi;
        if (this.schema !== undefined) {
            this.gridApi.setColumns(this.schema);
        }
        if (this.data !== undefined) {
            this.gridApi.setRowCount(this.data.length);
        }
    }

    requestRange(range: api.RowRange) {
        this.range = range;
        this.update();
    }

    requestSort(sort: api.ColumnSort[]) {
        this.sort = sort;
        this.resort();
        this.update();
    }

    requestFilter(filters : api.ColumnFilter[]) {
    }

    setSchema(schema : api.ColumnDefinition[]) {
        this.schema = schema;
        if (this.gridApi !== undefined) {
            this.gridApi.setColumns(this.schema);
        }
    }

    refresh(data : any[]) {
        this.data = data.map((x, i) => <api.DataRow>{ index : i, data : x});
        this.resort();

        if (this.gridApi !== undefined) {
            this.gridApi.setRowCount(this.data.length);
        }

        this.update();
    }

    private resort() {
        if (this.data === undefined) {
            return;            
        }
        this.data = this.data.sort((x, y) =>
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
        });
    }

    private update() : void {
        if (this.gridApi === undefined || this.data === undefined || this.range === undefined) {
            return;
        }
        this.gridApi.updateRows(
            this.data.slice(this.range.startIndex, this.range.startIndex + this.range.count)
            .map((x, i) => <api.DataRow>{ index : this.range.startIndex + i, data : x.data }));
    }
}