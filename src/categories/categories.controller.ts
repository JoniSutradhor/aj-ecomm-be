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
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Roles(UserRole.ADMIN)
@Controller('admin/categories')
export class CategoriesController {
    constructor(private readonly categories: CategoriesService) {}

    @Get()
    findAll() {
        return this.categories.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.categories.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateCategoryDto) {
        return this.categories.create(dto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCategoryDto
    ) {
        return this.categories.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(204)
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.categories.remove(id);
    }
}
