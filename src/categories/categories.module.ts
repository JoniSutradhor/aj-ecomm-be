import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { StoreCategoriesController } from './store-categories.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Category])],
    controllers: [CategoriesController, StoreCategoriesController],
    providers: [CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule {}
