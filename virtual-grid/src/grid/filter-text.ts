import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import { ComponentBase } from '../utils/utils';
import { Observable, Subject } from 'rxjs';
import * as api from './contracts';

export class FilterText implements api.IFilter {

    constructor(private readonly params : api.IFilterParams) {
    }

    public isEnabled() : boolean {
        return this._text !== '';
    }

    public getViewComponentType() : any {
        return FilterTextView;
    }

    private _text : string = '';
    public get text() : string { return this._text; };
    public set text(value : string) {
        if (this._text != value) {
           this._text = value;
           this.params.dataSource.requestFilter();
        }
    }

    public createFilterExpression<T>(builder : api.IExpressionBuilder<T>) : T {
        return builder.contains(this.params.column, this._text);
    }
}

@Component({
    selector: 'filter-text',
    template : `
    <div style="position:absolute;z-index:1"><input [(ngModel)]="filter.text" placeholder="Filter Text..."></div>
    `
})
export class FilterTextView extends ComponentBase {
    @Input() public filter : FilterText;
}
