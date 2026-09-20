import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ListStoreProductsDto } from './dto/list-store-products.dto';
import { ProductsService } from './products.service';

/** Public catalog, only active products are visible. */
@Public()
@Controller('store/products')
export class StoreProductsController {
    constructor(private readonly products: ProductsService) {}

    @Get()
    findAll(@Query() query: ListStoreProductsDto) {
        return this.products.findAllPublic(query);
    }

    @Get(':slug')
    findOne(@Param('slug') slug: string) {
        return this.products.findPublicBySlug(slug);
    }
}
