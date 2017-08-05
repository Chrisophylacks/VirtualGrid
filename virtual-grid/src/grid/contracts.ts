export interface ColumnDefinition {
    width? : number;
    field : string;
    title? : string;
    formatText? : (rowData : any) => string;
    formatCss? : (rowData : any) => string;
    filterFactory? : (params : IFilterParams) => IFilter;
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

export interface IGridApi {
    setColumnVisibility(column: ColumnDefinition, visible : boolean);
    getColumnVisibility(column: ColumnDefinition) : boolean;

    // data
    setRowCount(rowCount : number);
    setColumns(columns : ColumnDefinition[]);
    updateRows(rows : DataRow[]);

    buildFilterExpression<T>(builder : IExpressionBuilder<T>, defaultExpression :T) : T;
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
    requestFilter();

    getFilterValues(column : ColumnDefinition) : Promise<string[]>;
    getSuggestions(column : ColumnDefinition, text : string) : Promise<string[]>;
}

export interface IconSet {
    filter? : string;
}

export interface GridOptions {
    dataSource : IGridDataSource;
    rowHeight : number;
    rowAlternationMode? : RowAlternationMode;
    onRowDoubleClicked? : (any) => void;
    icons? : IconSet;
    api? : IGridApi;
}

export interface IFilter {
    isEnabled() : boolean;
    getViewComponentType() : any;
    createFilterExpression<T>(builder : IExpressionBuilder<T>) : T;
    prepareForView?() : void;
}

export interface IFilterParams {
    dataSource : IGridDataSource;
    column : ColumnDefinition;
}

export interface IExpressionBuilder<T> {
    contains(column : ColumnDefinition, text : string) : T,
    equals(column : ColumnDefinition, text : string) : T,
    and(first : T, second : T) : T;
    or(first : T, second : T) : T;
}