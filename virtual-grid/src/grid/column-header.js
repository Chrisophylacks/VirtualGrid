"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@angular/core");
const horizontaldragservice_1 = require("../utils/horizontaldragservice");
const utils_1 = require("../utils/utils");
const api = require("./contracts");
class Column {
    constructor(def) {
        this.def = def;
        this.width = new utils_1.Property();
        this.sortDirection = new utils_1.Property();
        this.width.value = (def.width || 100);
        this.sortDirection.value = api.SortDirection.None;
    }
    get title() {
        return this.def.title || this.def.field;
    }
    formatText(rowData) {
        if (rowData === null) {
            return '...';
        }
        if (this.def.formatText != null) {
            return this.def.formatText(rowData.data);
        }
        return rowData[this.def.field].toString();
    }
    getClass(rowData) {
        if (rowData !== null && this.def.formatCss != null) {
            return this.def.formatCss(rowData.data);
        }
        return '';
    }
}
exports.Column = Column;
let ColumnHeader = class ColumnHeader extends utils_1.ComponentBase {
    constructor(componentFactoryResolver, viewContainerRef) {
        super();
        this.componentFactoryResolver = componentFactoryResolver;
        this.viewContainerRef = viewContainerRef;
    }
    get column() {
        return this._column;
    }
    set column(column) {
        this._column = column;
    }
    get resizeGrip() { return this.resizeGripRef.nativeElement; }
    get currentWidth() {
        if (!this.column) {
            return '0px';
        }
        return this.column.width.value + 'px';
    }
    get currentTitle() {
        if (!this.column) {
            return '';
        }
        return this.column.title;
    }
    ngAfterViewInit() {
        this.initResize();
    }
    suppress(e) {
        e.stopPropagation();
    }
    sort() {
        switch (this._column.sortDirection.value) {
            case api.SortDirection.None: {
                this._column.sortDirection.value = api.SortDirection.Ascending;
                break;
            }
            case api.SortDirection.Ascending: {
                this._column.sortDirection.value = api.SortDirection.Descending;
                break;
            }
            case api.SortDirection.Descending: {
                this._column.sortDirection.value = api.SortDirection.None;
                break;
            }
        }
    }
    filter() {
        if (this._column.def.filterComponent !== undefined) {
            let factory = this.componentFactoryResolver.resolveComponentFactory(this._column.def.filterComponent);
            let component = this.viewContainerRef.createComponent(factory);
        }
    }
    initResize() {
        if (!this.resizeGripRef) {
            return;
        }
        this.anchor(horizontaldragservice_1.HorizontalDragService.addDragHandling({
            eDraggableElement: this.resizeGrip,
            cursor: 'col-resize',
            startAfterPixels: 0,
            onDragStart: () => this.onDragStart(),
            onDragging: (d, f) => this.onDragging(d, f),
        }));
    }
    onDragStart() {
        this.dragStartWidth = this.column.width.value;
    }
    onDragging(delta, finished) {
        this.column.width.value = this.dragStartWidth + delta;
    }
};
__decorate([
    core_1.Input(),
    __metadata("design:type", Column),
    __metadata("design:paramtypes", [Column])
], ColumnHeader.prototype, "column", null);
__decorate([
    core_1.ViewChild('resizeGrip'),
    __metadata("design:type", core_1.ElementRef)
], ColumnHeader.prototype, "resizeGripRef", void 0);
ColumnHeader = __decorate([
    core_1.Component({
        selector: 'vcolumn-header',
        template: `
    <div style="height:100%;display:inline-block" [style.width]='currentWidth'>
        <div class="column-header" (click)="sort()" style="height:100%">
            <div #resizeGrip class="resize-grip" style="float:right" (click)="suppress($event)"></div>
            <div *ngIf="column.sortDirection.value == 1" style="float:left">^</div>
            <div *ngIf="column.sortDirection.value == 2" style="float:left">V</div>
            <!--<button style="float:left" (click)="filter()">F</button>-->
            <div class="truncate" style="display:inline;user-select:none">{{currentTitle}}</div>
        </div>
    </div>`
    }),
    __metadata("design:paramtypes", [core_1.ComponentFactoryResolver,
        core_1.ViewContainerRef])
], ColumnHeader);
exports.ColumnHeader = ColumnHeader;
//# sourceMappingURL=column-header.js.map