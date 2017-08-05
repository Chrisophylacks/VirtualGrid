import * as api from '../grid/contracts';

export type Expression = (any) => boolean;

export class MemoryExpressionBuilder implements api.IExpressionBuilder<Expression> {

    public default : Expression = () => true;

    public contains(column : api.ColumnDefinition, text : string) : Expression {
        return x => {
                let value = x[column.field];
                if (value === undefined) {
                    return false;
                }
                return value.toString().indexOf(text) >= 0;
            }
    };

    public equals(column : api.ColumnDefinition, text : string) : Expression {
        return x => {
                let value = x[column.field];
                return value.toString() === text;
            }
    };

    public and(first : Expression, second : Expression) : Expression {
        return x => first(x) && second(x);
    }

    public or(first : Expression, second : Expression) : Expression {
        return x => first(x) || second(x);
    }    
}