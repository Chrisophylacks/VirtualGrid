import * as utils from '../utils/utils';
import * as api from './contracts';

export class Column {
    public width : utils.Property<number>;
    public isVisible : utils.Property<boolean>;
    public sortDirection : utils.Property<api.SortDirection>;
    public filter : api.IFilter | undefined;

    constructor(
        public readonly def : api. ColumnDefinition,
        dataSource : api.IGridDataSource
        ) {
        this.width = new utils.Property<number>(def.width || 100);
        this.isVisible = new utils.Property<boolean>(true);
        this.sortDirection = new utils.Property<number>(api.SortDirection.None);
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