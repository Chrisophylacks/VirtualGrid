import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import { FilterBase } from './filter-base';

import * as api from '../grid/contracts';

export class FilterSetEntry {
    public readonly isChecked = new utils.Property<boolean>(false);

    constructor(public readonly header : string) {
    }
}

export class FilterSet extends FilterBase {

    public entries : FilterSetEntry[] = new Array();

    private readonly subscription : utils.SerialSubscription = new utils.SerialSubscription();
    private readonly checkedValues = new Set<string>()
    
    constructor(params : api.IFilterParams) {
        super(params);
        this.prepareForView();
    }

    public prepareForView() {
        this.params.dataSource.getFilterValues(this.params.column)
            .then(values => {
                this.entries = values.filter(x => x !== null && x !== undefined && x !== '').map(x => new FilterSetEntry(x));
                for (let entry of this.entries) {
                    entry.isChecked.value = this.checkedValues.has(entry.header);
                }

                this.subscription.set(
                    new utils.CompositeSubscription(
                        this.entries.map(e => e.isChecked.onChanged(c => {
                            if (c) {
                                this.checkedValues.add(e.header);
                            } else {
                                this.checkedValues.delete(e.header);
                            }
                            this.raiseChanged();
                        }))));
            });
    }

    public isEnabled() : boolean {
        return this.checkedValues.size !== 0;
    }

    public getViewComponentType() : any {
        return FilterSetView;
    }

    public createFilterExpression<T>(builder : api.IExpressionBuilder<T>) : T {
        let expr : T;
        for (let value of this.checkedValues) {
            expr = expr
                ? builder.or(expr, builder.equals(this.params.column, value))
                : builder.equals(this.params.column, value);
        }
        return expr;
    }
}

@Component({
    selector: 'filter-set',
    template : `
    <div class="column-filter">
        <div *ngFor="let entry of filter.entries">
            <input type="checkbox" [(ngModel)]="entry.isChecked.value">{{entry.header}}
        </div>
    </div>
    `
})
export class FilterSetView {
    @Input() public filter : FilterSet;
}
