import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { VirtualGridModule } from 'virtual-grid';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, VirtualGridModule],
  bootstrap: [AppComponent],
})
export class AppModule { }