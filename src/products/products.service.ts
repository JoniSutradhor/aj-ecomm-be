import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { rethrowConflict } from '../common/db-errors';
import { Paginated } from '../common/pagination.dto';
import { uniqueSlug } from '../common/slug';
import { StockMovementType } from '../stock/stock-movement.entity';
import { StockService } from '../stock/stock.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.entity';

const CONFLICTS = {
    unique: 'A product with this SKU already exists',
    foreignKey: 'Category does not exist',
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product)
        private readonly products: Repository<Product>,
        private readonly dataSource: DataSource,
        private readonly stock: StockService
    ) {}

    async findAll({
        page,
        limit,
        search,
        status,
        categoryId,
        lowStock,
    }: ListProductsDto): Promise<Paginated<Product>> {
        const query = this.products
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .orderBy('product.createdAt', 'DESC')
            .addOrderBy('product.id', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            query.andWhere(
                `(product.name ILIKE :search ESCAPE '\\' OR product.sku ILIKE :search ESCAPE '\\')`,
                { search: `%${escapeLike(search)}%` }
            );
        }
        if (status) query.andWhere('product.status = :status', { status });
        if (categoryId) {
            query.andWhere('product.categoryId = :categoryId', { categoryId });
        }
        if (lowStock) {
            query.andWhere('product.stockQuantity <= product.lowStockThreshold');
        }

        const [items, total] = await query.getManyAndCount();
        return { items, total, page, limit };
    }

    async findOne(id: number) {
        const product = await this.products.findOne({
            where: { id },
            relations: { category: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return product;
    }

    async create(dto: CreateProductDto, userId: number) {
        const { initialStock, ...data } = dto;
        const slug = await uniqueSlug(this.products, dto.name);
        try {
            const id = await this.dataSource.transaction(async (manager) => {
                const product = await manager.save(
                    manager.create(Product, { ...data, slug })
                );
                if (initialStock) {
                    await this.stock.applyMovement(
                        manager,
                        product.id,
                        initialStock,
                        StockMovementType.INITIAL,
                        'Initial stock',
                        userId
                    );
                }
                return product.id;
            });
            return await this.findOne(id);
        } catch (error) {
            return rethrowConflict(error, CONFLICTS);
        }
    }

    /** The slug is kept on rename so existing links do not break. Stock is not editable here. */
    async update(id: number, dto: UpdateProductDto) {
        await this.findOne(id);
        if (Object.keys(dto).length) {
            try {
                await this.products.update(id, dto);
            } catch (error) {
                rethrowConflict(error, CONFLICTS);
            }
        }
        return this.findOne(id);
    }

    async remove(id: number) {
        const product = await this.findOne(id);
        await this.products.remove(product);
    }
}
