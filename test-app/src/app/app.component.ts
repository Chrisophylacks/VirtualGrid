import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import { TestDataSource } from './datasources';
import * as api from 'virtual-grid';

@Component({
  selector: 'application',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title: String = "App Works !";
  dataSource: TestDataSource;
  gridOptions : api.GridOptions;

  constructor() {
    this.gridOptions = {
      columns :
            [
                this.createColumn('index'),
                this.createColumn('data1'),
                this.createColumn('data2'),
                this.createColumn('data3'),
                this.createColumn('data4'),
                this.createColumn('data5'),
                this.createColumn('data6'),
                this.createColumn('data7'),
                this.createColumn('data8'),
                this.createColumn('data9'),
                this.createColumn('data10'),
                this.createColumn('data11'),
                this.createColumn('data12'),
                this.createColumn('data13'),
                this.createColumn('data14'),
                this.createColumn('data15'),
                this.createColumn('data16'),
                this.createColumn('data17'),
                this.createColumn('data18'),
                this.createColumn('data19')
            ],
            onGridReady : () =>
            {
              if (this.gridOptions.api !== undefined) {
                this.dataSource = new TestDataSource(this.gridOptions.api);
              }
            },
            rowHeight : 23,
            rowAlternationMode : api.RowAlternationMode.DataIndex
        };
  }

  public ngAfterViewInit(): void {
  }

  private createColumn(field : string) : api.ColumnDefinition {
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