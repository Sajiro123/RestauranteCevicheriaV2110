import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'orderBy'
})
export class OrderByPipe implements PipeTransform {
    transform(array: any[], field: string, reverse: boolean = false): any[] {
        if (!Array.isArray(array)) return array;

        return array.sort((a, b) => {
            if (a[field] < b[field]) return reverse ? 1 : -1;
            if (a[field] > b[field]) return reverse ? -1 : 1;
            return 0;
        });
    }
}
