// unique.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'unique',
    pure: false
})
export class UniquePipe implements PipeTransform {
    transform(value: any[], property: string): any[] {
        if (!value || !property) return value;

        return value.filter((item, index, array) => array.findIndex((t) => t[property] === item[property]) === index);
    }
}
