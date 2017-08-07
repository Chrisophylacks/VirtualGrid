import * as utils from '../utils/utils';
import { Column } from './column';
import { DragService } from '../utils/drag-service';

export class ColumnDragService {
    private dragMarker : HTMLElement
    
    public register(column : Column, grip : HTMLElement) : utils.Subscription {
        return DragService.addDragHandling(
            {
                eDraggableElement : grip,
                cursor : 'move',
                startAfterPixels : 2,
                onDragStart : () => this.onDrag(column),
                onDragging : (e, dx, dy, f) => this.onDragging(e, f),
            });
    }

    private onDrag(column : Column) : void {
        this.dragMarker = utils.createHtml(`<div style="width:auto;height:auto;background:red;position:fixed">${column.title}<div>`)
        document.body.appendChild(this.dragMarker);
    }

    private onDragging(e: MouseEvent, finished : boolean) : void {
        this.dragMarker.style.left = e.pageX + 'px';
        this.dragMarker.style.top = e.pageY + 'px';
        if (finished) {
            this.dragMarker.remove();
        }
    }    
}