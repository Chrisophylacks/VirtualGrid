import { NgModule, ANALYZE_FOR_ENTRY_COMPONENTS } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { VirtualGridComponent } from './grid/virtual-grid';
import { ColumnHeader } from './grid/column-header';
import { FilterTextView } from './grid/filter-text';
import { MenuPopup } from './grid/menu-popup';

@NgModule({
  declarations: [VirtualGridComponent, ColumnHeader, FilterTextView, MenuPopup],
  imports: [FormsModule, BrowserModule],
  exports: [VirtualGridComponent],
  entryComponents: [ FilterTextView ]
})
export class VirtualGridModule { }
