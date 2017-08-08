import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import { FilterBase } from './filter-base';

import * as api from '../grid/contracts';

export class FilterText extends FilterBase {

    public readonly text = new utils.Property<string>('');

    constructor(params : api.IFilterParams, throttleTimeMs? : number) {
        super(params);
        var throttleTime = throttleTimeMs || 200;
        this.text.onChanged(() => this.raiseChanged(throttleTime));
    }

    public isEnabled() : boolean {
        return this.text.value !== '';
    }

    public getViewComponentType() : any {
        return FilterTextView;
    }

    public createFilterExpression<T>(builder : api.IExpressionBuilder<T>) : T {
        return builder.contains(this.params.column, this.text.value);
    }

    public getState() : any {
        return this.text.value;
    }

    public setState(layout : any) : void {
        this.text.value = layout;
    }
}

@Component({
    selector: 'filter-text',
    template : `
    <div class="column-filter" style=""><input [(ngModel)]="filter.text.value" placeholder="Filter Text..."></div>
    `
})
export class FilterTextView {
    @Input() public filter : FilterText;
}
