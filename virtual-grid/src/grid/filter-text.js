"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular/core");
const utils_1 = require("../utils/utils");
let FilterText = class FilterText extends utils_1.ComponentBase {
    constructor() {
        super(...arguments);
        this._text = '';
    }
    get change() { return this._change; }
    get text() { return this._text; }
    ;
    set text(value) {
        if (this._text != value) {
            this._text = value;
            this._change.next();
        }
    }
    apply(value) {
        return value.toString().indexOf(this._text) >= 0;
    }
};
FilterText = __decorate([
    core_1.Component({
        selector: 'filter-text',
        template: `
    <div><input [(ngModel)]="text"></div>
    `
    })
], FilterText);
exports.FilterText = FilterText;
//# sourceMappingURL=filter-text.js.map