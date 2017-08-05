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
  private columns = Array.of<api.ColumnDefinition>();

  constructor() {
    this.columns.push({
      field : 'status',
      width : 60,
      filterFactory : p => new api.FilterSet(p)
    })
    for (let i = 1; i <= 20; ++ i){
      this.columns.push(this.createColumn(i));
    }

    let step = 0;
    let createRow = (index : number) => {
        let row = { status : (index % 10).toString() };
        let h = 0;
        for (let col of this.columns) {
          if (col.field !== 'status') {
            row[col.field] = h + '-' + (index + h) + '-' + step;
          }
          ++h;
        }
        return row;
    }

    let dataSource = new api.MemoryDataSource();
    setTimeout(() => {
      dataSource.setSchema(this.columns);

      let rows = new Array();
      for (let i = 0; i < 1000; ++ i) {
        rows.push(createRow(i));
      }
      dataSource.refresh(rows);

      // setInterval(() => {
      //   ++step;
      //   dataSource.beginBatch();
      //   for (let i = 0; i < 1000; i += 10) {
      //     dataSource.update(i, createRow(i));
      //   }
      //   dataSource.endBatch();
      // }, 100);
    }, 2000);
    
    this.gridOptions = {
      dataSource : dataSource,
      rowHeight : 23,
      rowAlternationMode : api.RowAlternationMode.VisualIndex
    };
  }

  public ngAfterViewInit(): void {
  }

  private v : boolean = false;
  public showhide() {
    this.gridOptions.api.setColumnVisibility(this.columns[1], this.v);
    this.v = !this.v;
  }

  private createColumn(i : number) : api.ColumnDefinition {
    let field = 'data' + i;
    return {
      field : field,
      width : 70,
      // formatCss : value =>
      // {
      //   return (value[field].toString().indexOf('9') >= 0) ? 'nines' : '';
      // },
      // formatText : value =>
      // {
      //   return (<string>value[field].toString()).replace(/-/g, ' ');
      // },
      filterFactory : params => new api.FilterText(params)
    }
  }
}