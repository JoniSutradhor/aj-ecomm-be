import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from './categories.service';

/** Public categories, with the number of active products in each. */
@Public()
@Controller('store/categories')
export class StoreCategoriesController {
    constructor(private readonly categories: CategoriesService) {}

    @Get()
    findAll() {
        return this.categories.findAllPublic();
    }
}
