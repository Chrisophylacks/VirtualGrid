import * as utils from '../utils/utils';
import * as api from './contracts';

export class Column {
    public width : utils.Property<number>;
    public sortDirection : utils.Property<api.SortDirection>;
    public filter : api.IFilter | undefined;
    public order : number;
    public isVisible : boolean = true;

    constructor(
        public readonly def : api. ColumnDefinition,
        dataSource : api.IGridDataSource,
        initialOrder : number
        ) {
        this.width = new utils.Property<number>(def.width || 100);
        this.sortDirection = new utils.Property<number>(api.SortDirection.None);
        this.order = initialOrder;
        if (def.filterFactory) {
            this.filter = def.filterFactory(
                {
                    dataSource : dataSource,
                    column : def
                });
        }
    }

    get title() : string {
        return this.def.title || this.def.field;
    }

    public formatText(rowData? : api.DataRow) : string {
        if (rowData === undefined) { 
            return '...';
        }
        if (this.def.formatText != null) {
            return this.def.formatText(rowData.data);
        }

        let fieldValue =  rowData.data[this.def.field];
        if (fieldValue === undefined) {
            return '';
        }
        return fieldValue.toString();
    }

    public getClass(rowData : api.DataRow) : string {
        if (rowData !== undefined && this.def.formatCss != null) {
            return this.def.formatCss(rowData.data);
        }
        return '';
    }

    public flipSorting() {
        switch (this.sortDirection.value) {
            case api.SortDirection.None: {
                this.sortDirection.value = api.SortDirection.Ascending;
                break;
            }
            case api.SortDirection.Ascending: {
                this.sortDirection.value = api.SortDirection.Descending;
                break;
            }
            case api.SortDirection.Descending: {
                this.sortDirection.value = api.SortDirection.None;
                break;
            }
        }
    }
}