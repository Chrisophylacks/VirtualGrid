import { NgModule, ANALYZE_FOR_ENTRY_COMPONENTS } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CanvasGridComponent } from './grid/canvas-grid';
import { ColumnHeaderView } from './grid/column-header-view';
import { FilterTextView } from './filters/filter-text';
import { FilterSetView } from './filters/filter-set';
import { MenuPopup } from './grid/menu-popup';

@NgModule({
  declarations: [CanvasGridComponent, ColumnHeaderView, FilterTextView, FilterSetView, MenuPopup],
  imports: [FormsModule, BrowserModule],
  exports: [CanvasGridComponent],
  entryComponents: [ FilterTextView, FilterSetView ]
})
export class VirtualGridModule { }
