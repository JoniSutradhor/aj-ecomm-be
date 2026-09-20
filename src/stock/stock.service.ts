import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Paginated } from '../common/pagination.dto';
import { Product } from '../products/product.entity';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListMovementsDto } from './dto/list-movements.dto';
import { StockMovement, StockMovementType } from './stock-movement.entity';

export interface StockSummary {
    totalProducts: number;
    totalUnits: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    /** Sum of stockQuantity * price over non archived products. */
    inventoryValue: number;
}

const POSITIVE_ONLY = [
    StockMovementType.INITIAL,
    StockMovementType.RESTOCK,
    StockMovementType.RETURN,
];
const NEGATIVE_ONLY = [StockMovementType.DAMAGE, StockMovementType.SALE];

@Injectable()
export class StockService {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(StockMovement)
        private readonly movements: Repository<StockMovement>
    ) {}

    adjust(dto: AdjustStockDto, userId: number) {
        return this.dataSource.transaction((manager) =>
            this.applyMovement(
                manager,
                dto.productId,
                dto.delta,
                dto.type,
                dto.reason ?? null,
                userId
            )
        );
    }

    /**
     * The one place stock changes. Locks the product row so concurrent orders and
     * adjustments cannot oversell, updates the quantity and writes the ledger row.
     * Pass the manager of the surrounding transaction (e.g. product create, order placement).
     */
    async applyMovement(
        manager: EntityManager,
        productId: number,
        delta: number,
        type: StockMovementType,
        reason: string | null,
        userId: number | null
    ): Promise<StockMovement> {
        if (POSITIVE_ONLY.includes(type) && delta <= 0) {
            throw new BadRequestException(`${type} must add stock (delta > 0)`);
        }
        if (NEGATIVE_ONLY.includes(type) && delta >= 0) {
            throw new BadRequestException(
                `${type} must remove stock (delta < 0)`
            );
        }

        const product = await manager.findOne(Product, {
            where: { id: productId },
            lock: { mode: 'pessimistic_write' },
        });
        if (!product) throw new NotFoundException('Product not found');

        const quantityAfter = product.stockQuantity + delta;
        if (quantityAfter < 0) {
            throw new BadRequestException(
                `Insufficient stock: ${product.stockQuantity} available, cannot remove ${-delta}`
            );
        }

        await manager.update(Product, productId, {
            stockQuantity: quantityAfter,
        });
        return manager.save(
            manager.create(StockMovement, {
                productId,
                type,
                delta,
                quantityAfter,
                reason,
                userId,
            })
        );
    }

    async listMovements({
        page,
        limit,
        productId,
        type,
    }: ListMovementsDto): Promise<Paginated<StockMovement>> {
        const [items, total] = await this.movements.findAndCount({
            where: { productId, type },
            relations: { product: true },
            select: {
                product: { id: true, name: true, sku: true },
            },
            order: { createdAt: 'DESC', id: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit };
    }

    async summary(): Promise<StockSummary> {
        const [row] = await this.dataSource.query(`
            SELECT
                COUNT(*)::int AS "totalProducts",
                COALESCE(SUM("stockQuantity"), 0)::int AS "totalUnits",
                (COUNT(*) FILTER (
                    WHERE "stockQuantity" > 0 AND "stockQuantity" <= "lowStockThreshold"
                ))::int AS "lowStockProducts",
                (COUNT(*) FILTER (WHERE "stockQuantity" = 0))::int AS "outOfStockProducts",
                COALESCE(SUM("stockQuantity" * "price"), 0)::float8 AS "inventoryValue"
            FROM products
            WHERE status <> 'archived'
        `);
        return row;
    }
}
