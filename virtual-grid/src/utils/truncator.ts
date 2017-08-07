export class Truncator {
    private readonly ellipsis = '…';
    private readonly ellipsisWidth : number;

    constructor(private readonly context : CanvasRenderingContext2D) {
        this.ellipsisWidth = context.measureText(this.ellipsis).width;
    }

    public fitString(str : string, maxWidth : number) : string {
        if (maxWidth < this.ellipsisWidth) {
            return '';
        }

        // optimize - assume text should occupy at least 4 pixels for symbol
        if (str.length * 4 > maxWidth) {
            str = str.substring(0, Math.ceil(maxWidth / 4));
        }

        var width = this.context.measureText(str).width;
        if (width <= maxWidth) {
            return str;
        }
        if (width <= this.ellipsisWidth) {
            return '';
        }
        let totalWidth = maxWidth - this.ellipsisWidth;

        let low = 0;
        let high = str.length;

        let i = 0;
        while (high - low > 1) {
            let mid = Math.ceil(low + ((high - low) / 2));
            if (this.context.measureText(str.substring(0, mid)).width <= totalWidth) {
                low = mid;
            }
            else {
                high = mid;
            }
        }

        if (low === 0) {
            return this.ellipsis;
        }

        return str.substring(0, low) + this.ellipsis;
    }    
}
