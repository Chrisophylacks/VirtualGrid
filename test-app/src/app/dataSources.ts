import { Observable } from 'rxjs';
import * as api from 'virtual-grid';

export class TestDataSource {
    public readonly columns : api.ColumnDefinition[];
    private readonly rowCount : number = 500;
    private range : api.RowRange;
    private sort : api.ColumnSort[];
    private viewportVersion : number = 0;
    private timer : number = 0;

    constructor(private readonly grid : api.IGridApi) {
        grid.setRowCount(this.rowCount);
        grid.rangeChanges.subscribe(x =>
        {
            this.range = x;
            this.onViewportChanged();
        });

        grid.sortChanges.subscribe(x =>
        {
            this.sort = x;
            this.onViewportChanged();
        });

        setInterval(() =>
        {
            this.timer++;
            this.update();
        }, 1000);
    }
   
    private onViewportChanged() {
        let version = ++this.viewportVersion;
        setTimeout(() =>
        {
            if (this.viewportVersion == version) {
                let rows : api.DataRow[] = new Array();
                for (let i = 0; i < this.range.count; ++i) {
                    rows.push(this.getRowByIndex(this.range.startIndex + i));
                }
                this.grid.update(rows);
            }
        }, 200);
    }

    private getRowByIndex(index : number) : api.DataRow {
        let sortIndex = this.sort.find(c => c.column.field === 'index');
        let ascend = sortIndex === undefined || sortIndex.sortDirection !== api.SortDirection.Descending;
        let dataIndex = ascend ? index : this.rowCount - index - 1;

        var row = { 
            index : index,
            data : {
                index : dataIndex,
                data1 : dataIndex + '-1',
                data2 : dataIndex + '-2',
                data3 : dataIndex + '-3',
                data4 : dataIndex + '-4',
                data5 : dataIndex + '-5',
                data6 : dataIndex + '-6',
                data7 : dataIndex + '-7',
                data8 : dataIndex + '-8',
                data9 : dataIndex + '-9',
                data10 : dataIndex + '-0',
                data11 : dataIndex + '-1',
                data12 : dataIndex + '-2',
                data13 : dataIndex + '-3',
                data14 : dataIndex + '-4',
                data15 : dataIndex + '-5',
                data16 : dataIndex + '-6',
                data17 : dataIndex + '-7',
                data18 : dataIndex + '-8',
                data19 : dataIndex + '-9',                
            }
        };

        if (dataIndex % 10 == 0) {
            row.data.data1 += '-' + this.timer;
        }
        return row;
    }

    private update() : void {
        let rows : api.DataRow[] = new Array();
        for (let i = 0; i < this.range.count; ++i) {
            let index = i + this.range.startIndex;
            if (index % 10 === 0) {
                rows.push(this.getRowByIndex(index));
           }
        }

        if (rows.length > 0) {
            this.grid.update(rows);
        }
    }
}