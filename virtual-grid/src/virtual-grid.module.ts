import { NgModule, ANALYZE_FOR_ENTRY_COMPONENTS } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { VirtualGridComponent } from './grid/virtual-grid';
import { CanvasGridComponent } from './grid/canvas-grid';
import { ColumnHeader } from './grid/column-header';
import { FilterTextView } from './filters/filter-text';
import { FilterSetView } from './filters/filter-set';
import { MenuPopup } from './grid/menu-popup';

@NgModule({
  declarations: [VirtualGridComponent, CanvasGridComponent, ColumnHeader, FilterTextView, FilterSetView, MenuPopup],
  imports: [FormsModule, BrowserModule],
  exports: [VirtualGridComponent,CanvasGridComponent],
  entryComponents: [ FilterTextView, FilterSetView ]
})
export class VirtualGridModule { }
