import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowConflict } from '../common/db-errors';
import { uniqueSlug } from '../common/slug';
import { Product, ProductStatus } from '../products/product.entity';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categories: Repository<Category>
    ) {}

    /** All categories with the number of products in each. */
    async findAll() {
        const { entities, raw } = await this.categories
            .createQueryBuilder('category')
            .addSelect(
                (sub) =>
                    sub
                        .select('COUNT(*)')
                        .from(Product, 'product')
                        .where('product.categoryId = category.id'),
                'product_count'
            )
            .orderBy('category.name', 'ASC')
            .getRawAndEntities();
        // No joins, so raw rows line up one to one with the entities
        return entities.map((category, index) => ({
            ...category,
            productCount: Number(raw[index].product_count),
        }));
    }

    /** Categories that have at least one active product. */
    async findAllPublic() {
        const { entities, raw } = await this.categories
            .createQueryBuilder('category')
            .addSelect(
                (sub) =>
                    sub
                        .select('COUNT(*)')
                        .from(Product, 'product')
                        .where('product.categoryId = category.id')
                        .andWhere('product.status = :status', {
                            status: ProductStatus.ACTIVE,
                        }),
                'product_count'
            )
            .orderBy('category.name', 'ASC')
            .getRawAndEntities();
        return entities
            .map((category, index) => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                productCount: Number(raw[index].product_count),
            }))
            .filter((category) => category.productCount > 0);
    }

    async findOne(id: number) {
        const category = await this.categories.findOne({ where: { id } });
        if (!category) throw new NotFoundException('Category not found');
        return category;
    }

    async create(dto: CreateCategoryDto) {
        const slug = await uniqueSlug(this.categories, dto.name);
        try {
            return await this.categories.save(
                this.categories.create({ ...dto, slug })
            );
        } catch (error) {
            return rethrowConflict(error, {
                unique: 'A category with this name already exists',
            });
        }
    }

    async update(id: number, dto: UpdateCategoryDto) {
        const category = await this.findOne(id);
        if (dto.name && dto.name !== category.name) {
            category.slug = await uniqueSlug(this.categories, dto.name, id);
        }
        Object.assign(category, dto);
        try {
            return await this.categories.save(category);
        } catch (error) {
            return rethrowConflict(error, {
                unique: 'A category with this name already exists',
            });
        }
    }

    async remove(id: number) {
        const category = await this.findOne(id);
        try {
            await this.categories.remove(category);
        } catch (error) {
            rethrowConflict(error, {
                foreignKey:
                    'Category still has products, move or delete them first',
            });
        }
    }
}
