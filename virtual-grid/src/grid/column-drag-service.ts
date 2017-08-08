import * as utils from '../utils/utils';
import { Column } from './column';
import { DragService } from '../utils/drag-service';

export class ColumnDragService {

    constructor(private readonly getVisibleColumns : () => Column[]) {
    }
    
}