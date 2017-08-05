import 'core-js/es6';
import 'core-js/es7/reflect';
import 'zone.js/dist/zone';

require('virtual-grid/dist/utils/utils.js');

import './main.less';

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule); 