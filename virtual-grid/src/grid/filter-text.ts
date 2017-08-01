import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import { ComponentBase } from '../utils/utils';
import { Observable, Subject } from 'rxjs';
import * as api from './contracts';

@Component({
    selector: 'filter-text',
    template : `
    <div><input [(ngModel)]="text"></div>
    `
})
export class FilterText extends ComponentBase implements api.IFilter {

    private _change : Subject<void>
    public get change() { return this._change; }

    private _text : string = '';
    public get text() : string { return this._text; };
    public set text(value : string) {
        if (this._text != value) {
           this._text = value;
           this._change.next();
        }
    }

    public apply(value : any) : boolean {
        return value.toString().indexOf(this._text) >= 0;
    }
}