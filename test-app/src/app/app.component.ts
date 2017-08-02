import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import * as api from 'virtual-grid';

@Component({
  selector: 'application',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title: String = "App Works !";
  gridOptions : api.GridOptions;

  constructor() {
    let columns =new Array();
    for (let i = 1; i <= 20; ++ i){
      columns.push(this.createColumn(i));
    }

    let dataSource = new api.MemoryDataSource();
    setTimeout(() => {
      dataSource.setSchema(columns);

      let rows = new Array();
      for (let i = 1; i <= 1000; ++ i) {
        let row = { index : i };
        for (let col of columns) {
          row[col.field] = col.field + '-' + i;
        }
        rows.push(row);
      }
      dataSource.refresh(rows);
    }, 2000);
    
    this.gridOptions = {
      dataSource : dataSource,
      rowHeight : 23,
      rowAlternationMode : api.RowAlternationMode.DataIndex
    };
  }

  public ngAfterViewInit(): void {
  }

  private createColumn(i : number) : api.ColumnDefinition {
    let field = 'data' + i;
    return {
      field : field,
      width : 70,
      formatCss : value =>
      {
        return (value[field].toString().indexOf('9') >= 0) ? 'nines' : '';
      },
      formatText : value =>
      {
        return (<string>value[field].toString()).replace(/-/g, ' ');
      }
    }
  }
}