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
import {
    ListStoreProductsDto,
    StoreProductSort,
} from './dto/list-store-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductStatus } from './product.entity';

const CONFLICTS = {
    unique: 'A product with this SKU already exists',
    foreignKey: 'Category does not exist',
};

const STORE_ORDER: Record<StoreProductSort, [string, 'ASC' | 'DESC']> = {
    [StoreProductSort.NEWEST]: ['product.createdAt', 'DESC'],
    [StoreProductSort.PRICE_ASC]: ['product.price', 'ASC'],
    [StoreProductSort.PRICE_DESC]: ['product.price', 'DESC'],
    [StoreProductSort.NAME]: ['product.name', 'ASC'],
};

/** What shoppers may see, no sku, status or stock thresholds. */
const toStoreProduct = (product: Product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.images,
    stockQuantity: product.stockQuantity,
    category: product.category && {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
    },
});

const escapeLike =(value: string) => value.replace(/[\\%_]/g, '\\$&');

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

    async findAllPublic({
        page,
        limit,
        search,
        categoryId,
        sort,
    }: ListStoreProductsDto): Promise<
        Paginated<ReturnType<typeof toStoreProduct>>
    > {
        const [column, direction] = STORE_ORDER[sort];
        const query = this.products
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .where('product.status = :status', { status: ProductStatus.ACTIVE })
            .orderBy(column, direction)
            .addOrderBy('product.id', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            query.andWhere(
                `(product.name ILIKE :search ESCAPE '\\' OR product.description ILIKE :search ESCAPE '\\')`,
                { search: `%${escapeLike(search)}%` }
            );
        }
        if (categoryId) {
            query.andWhere('product.categoryId = :categoryId', { categoryId });
        }

        const [items, total] = await query.getManyAndCount();
        return { items: items.map(toStoreProduct), total, page, limit };
    }

    async findPublicBySlug(slug: string) {
        const product = await this.products.findOne({
            where: { slug, status: ProductStatus.ACTIVE },
            relations: { category: true },
        });
        if (!product) throw new NotFoundException('Product not found');
        return toStoreProduct(product);
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
