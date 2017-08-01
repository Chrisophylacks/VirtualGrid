import { NgModule, ANALYZE_FOR_ENTRY_COMPONENTS } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { VirtualGridComponent } from './grid/virtual-grid';
import { ColumnHeader } from './grid/column-header';
import { FilterText } from './grid/filter-text';

@NgModule({
  declarations: [VirtualGridComponent, ColumnHeader, FilterText],
  imports: [FormsModule, BrowserModule],
  exports: [VirtualGridComponent],
  entryComponents: [ FilterText ],
  providers: [ { provide: ANALYZE_FOR_ENTRY_COMPONENTS, useValue: [], multi:true } ] 
})
export class VirtualGridModule { }
