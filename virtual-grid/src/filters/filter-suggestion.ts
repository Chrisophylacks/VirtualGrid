import * as utils from '../utils/utils';

import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, Input } from "@angular/core";
import { FilterBase } from './filter-base';

import * as api from '../grid/contracts';

export class FilterSuggestionEntry {
    public readonly isChecked = new utils.Property<boolean>(false);

    constructor(public readonly header : string) {
    }
}

export class FilterSuggestion extends FilterBase {

    public readonly text = new utils.Property<string>('');
    public entries : FilterSuggestionEntry[] = new Array();
    
    private readonly subscription : utils.SerialSubscription = new utils.SerialSubscription();
    private readonly checkedValues = new Set<string>()
    
    constructor(params : api.IFilterParams) {
        super(params);
        this.text.onChanged(input =>
        {
            this.params.dataSource.getSuggestions(this.params.column, input)
                .then(values => {
                    this.entries = values.filter(x => x !== null && x !== undefined && x !== '').map(x => new FilterSuggestionEntry(x));
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
        })
    }

    public prepareForView() {
    }

    public isEnabled() : boolean {
        return this.checkedValues.size !== 0;
    }

    public getViewComponentType() : any {
        return FilterSuggestionView;
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
    selector: 'filter-suggestion',
    template : `
    <div class="column-filter">
        <div *ngFor="let entry of filter.entries">
            <input type="checkbox" [(ngModel)]="entry.isChecked.value">{{entry.header}}
        </div>
    </div>
    `
})
export class FilterSuggestionView {
    @Input() public filter : FilterSuggestion;
}
