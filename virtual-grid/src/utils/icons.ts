import * as api from '../grid/contracts';

export class DefaultIconSet {
    
    public filter = `<svg width="12" height="12"><polygon points="0,0 5,5 5,12 7,12 7,5 12,0"></polygon></svg>`;
}

export class IconFactory {
    private readonly defaultIconSet = new DefaultIconSet();

    public constructor(private readonly icons : api.IconSet) {
    }

    public getIcon(iconName : keyof api.IconSet) : string {
        if (this.icons) {
            let factory = this.icons[iconName];
            if (factory) {
                return factory;
            }
        }
        return this.defaultIconSet[iconName];
    }
}