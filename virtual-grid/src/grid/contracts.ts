import { Observable } from 'rxjs';

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
    rangeChanges : Observable<RowRange>;
    sortChanges : Observable<ColumnSort[]>
    filterChanges : Observable<ColumnFilter[]>
    update(rows : DataRow[]);
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

export interface GridOptions {
    columns : ColumnDefinition[];
    rowHeight : number;
    onGridReady? : () => void;
    api? : IGridApi;
    rowAlternationMode? : RowAlternationMode
}

export interface IFilter {
    change : Observable<void>;
    apply(value : any) : boolean;
}