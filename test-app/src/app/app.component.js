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
const datasources_1 = require("./datasources");
const api = require("virtual-grid");
let AppComponent = class AppComponent {
    constructor() {
        this.title = "App Works !";
        this.gridOptions = {
            columns: [
                this.createColumn('index'),
                this.createColumn('data1'),
                this.createColumn('data2'),
                this.createColumn('data3'),
                this.createColumn('data4'),
                this.createColumn('data5'),
                this.createColumn('data6'),
                this.createColumn('data7'),
                this.createColumn('data8'),
                this.createColumn('data9'),
                this.createColumn('data10'),
                this.createColumn('data11'),
                this.createColumn('data12'),
                this.createColumn('data13'),
                this.createColumn('data14'),
                this.createColumn('data15'),
                this.createColumn('data16'),
                this.createColumn('data17'),
                this.createColumn('data18'),
                this.createColumn('data19')
            ],
            onGridReady: () => {
                if (this.gridOptions.api !== undefined) {
                    this.dataSource = new datasources_1.TestDataSource(this.gridOptions.api);
                }
            },
            rowHeight: 23,
            rowAlternationMode: api.RowAlternationMode.DataIndex
        };
    }
    ngAfterViewInit() {
    }
    createColumn(field) {
        return {
            field: field,
            width: 70,
            formatCss: value => {
                return (value[field].toString().indexOf('9') >= 0) ? 'nines' : '';
            },
            formatText: value => {
                return value[field].toString().replace(/-/g, ' ');
            }
        };
    }
};
AppComponent = __decorate([
    core_1.Component({
        selector: 'application',
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.css']
    }),
    __metadata("design:paramtypes", [])
], AppComponent);
exports.AppComponent = AppComponent;
//# sourceMappingURL=app.component.js.map