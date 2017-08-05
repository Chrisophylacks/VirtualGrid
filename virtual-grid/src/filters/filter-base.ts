import * as utils from '../utils/utils';
import * as api from '../grid/contracts';

export abstract class FilterBase implements api.IFilter {

    private requestToken : any;
    private requestFilter : (arg : void, time? : number) => void;

    constructor(protected readonly params : api.IFilterParams) {
        this.requestFilter = utils.controlledThrottled<void>(() => params.dataSource.requestFilter());
    }

    public abstract isEnabled() : boolean;

    public abstract getViewComponentType() : any;

    public abstract createFilterExpression<T>(builder : api.IExpressionBuilder<T>);

    public raiseChanged(throttleTime? : number) : void {
        this.requestFilter(undefined, throttleTime);
    }
}