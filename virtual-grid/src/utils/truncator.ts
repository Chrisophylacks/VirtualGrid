export class Truncator {
    private readonly ellipsis : '…';
    private readonly ellipsisWidth : number;

    constructor(private readonly context : CanvasRenderingContext2D) {
        this.ellipsisWidth = context.measureText(this.ellipsis).width;
    }

    public fitString(str : string, maxWidth : number) : string {
        var width = this.context.measureText(str).width;
        if (width <= maxWidth) {
            return str;
        }
        if (width <= this.ellipsisWidth) {
            return '';
        }

        var len = str.length;
        while (width>=maxWidth-this.ellipsisWidth && len-->0) {
            str = str.substring(0, len);
            width = this.context.measureText(str).width;
        }
        return str + this.ellipsis;
    }    
}
