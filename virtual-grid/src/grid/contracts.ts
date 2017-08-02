export interface ColumnDefinition {
    width? : number;
    field : string;
    title? : string;
    formatText? : (rowData : any) => string;
    formatCss? : (rowData : any) => string;
    filterComponent? : any;
}

export interface DataRow {
    index : number;
    data? : any;
}

export interface RowRange {
    startIndex : number;
    count : number;
}

export interface ColumnSort {
    column : ColumnDefinition;
    sortDirection : SortDirection;
}

export interface ColumnFilter {
    column : ColumnDefinition
    filterState : any
}

export interface IGridApi {
    setRowCount(rowCount : number);
    setColumns(columns : ColumnDefinition[]);
    updateRows(rows : DataRow[]);
}

export enum RowAlternationMode {
    None = 0,
    DataIndex = 1,
    VisualIndex = 2
}

export enum SortDirection {
    None = 0,
    Ascending = 1,
    Descending = 2
}

export interface IGridDataSource {
    init(gridApi : IGridApi) : void;
    requestRange(range: RowRange);
    requestSort(sort: ColumnSort[]);
    requestFilter(filters : ColumnFilter[]);
}

export interface GridOptions {
    dataSource : IGridDataSource;
    rowHeight : number;
    rowAlternationMode? : RowAlternationMode;
    onRowDoubleClicked? : (any) => void;
}