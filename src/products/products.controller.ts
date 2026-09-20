import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Roles(UserRole.ADMIN)
@Controller('admin/products')
export class ProductsController {
    constructor(private readonly products: ProductsService) {}

    @Get()
    findAll(@Query() query: ListProductsDto) {
        return this.products.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.products.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateProductDto, @CurrentUser() user: User) {
        return this.products.create(dto, user.id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProductDto
    ) {
        return this.products.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.products.remove(id);
    }
}
