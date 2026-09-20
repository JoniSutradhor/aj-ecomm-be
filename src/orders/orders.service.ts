import { randomUUID } from 'node:crypto';
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
    DataSource,
    EntityManager,
    FindOptionsWhere,
    Repository,
} from 'typeorm';
import { AppConfig } from '../config/configuration';
import { escapeLike } from '../common/like';
import { Paginated } from '../common/pagination.dto';
import { Product, ProductStatus } from '../products/product.entity';
import { StockMovementType } from '../stock/stock-movement.entity';
import { StockService } from '../stock/stock.service';
import { User } from '../users/user.entity';
import { ListOrdersDto } from './dto/list-orders.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderItem } from './order-item.entity';
import {
    Order,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from './order.entity';

/** Allowed status changes. A shipped order can only be delivered, returns are handled by hand. */
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const WITH_ITEMS = {
    relations: { items: true },
    order: { items: { id: 'ASC' as const } },
};

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private readonly orders: Repository<Order>,
        private readonly dataSource: DataSource,
        private readonly stock: StockService,
        private readonly config: ConfigService<AppConfig, true>
    ) {}

    /**
     * Checkout. Everything happens in one transaction: prices and names are read from the
     * database (never from the client), stock is removed through the ledger, and if any line
     * cannot be filled nothing is saved.
     */
    async place(dto: PlaceOrderDto, user: User | null) {
        // The same product twice in the cart becomes one line
        const quantities = new Map<number, number>();
        for (const { productId, quantity } of dto.items) {
            quantities.set(
                productId,
                (quantities.get(productId) ?? 0) + quantity
            );
        }
        const productIds = [...quantities.keys()].sort((a, b) => a - b);

        const orderId = await this.dataSource.transaction(async (manager) => {
            const products = await manager
                .createQueryBuilder(Product, 'product')
                .where('product.id IN (:...productIds)', { productIds })
                .getMany();
            const byId = new Map(
                products.map((product) => [product.id, product])
            );

            const lines = productIds.map((productId) => {
                const product = byId.get(productId);
                if (!product || product.status !== ProductStatus.ACTIVE) {
                    throw new BadRequestException(
                        product
                            ? `"${product.name}" is no longer available`
                            : `Product ${productId} is not available`
                    );
                }
                const quantity = quantities.get(productId)!;
                if (product.stockQuantity < quantity) {
                    throw new BadRequestException(
                        product.stockQuantity > 0
                            ? `Only ${product.stockQuantity} of "${product.name}" left in stock`
                            : `"${product.name}" is out of stock`
                    );
                }
                return { product, quantity };
            });

            const subtotal = round2(
                lines.reduce(
                    (sum, { product, quantity }) =>
                        sum + product.price * quantity,
                    0
                )
            );
            const shippingFee = round2(
                this.config.get('store', { infer: true }).shippingFee
            );

            // The number is derived from the generated id, so insert first and set it right after
            const {
                identifiers: [{ id }],
            } = await manager.insert(Order, {
                orderNumber: randomUUID(),
                paymentMethod: PaymentMethod.COD,
                userId: user?.id ?? null,
                fullName: dto.fullName.trim(),
                email: dto.email.trim().toLowerCase(),
                phone: dto.phone.trim(),
                addressLine: dto.addressLine.trim(),
                city: dto.city.trim(),
                postalCode: dto.postalCode?.trim() || null,
                notes: dto.notes?.trim() || null,
                subtotal,
                shippingFee,
                total: round2(subtotal + shippingFee),
            });
            const orderNumber = `AJ-${String(id).padStart(6, '0')}`;
            await manager.update(Order, id, { orderNumber });
            await manager.insert(
                OrderItem,
                lines.map(({ product, quantity }) => ({
                    orderId: id,
                    productId: product.id,
                    name: product.name,
                    sku: product.sku,
                    image: product.images[0] ?? null,
                    unitPrice: product.price,
                    quantity,
                    lineTotal: round2(product.price * quantity),
                }))
            );

            // Ascending product order everywhere, so two orders never lock rows in opposite order
            for (const { product, quantity } of lines) {
                await this.stock.applyMovement(
                    manager,
                    product.id,
                    -quantity,
                    StockMovementType.SALE,
                    `Order ${orderNumber}`,
                    user?.id ?? null
                );
            }
            return id as number;
        });

        return this.findOne(orderId);
    }

    async findOne(id: number) {
        const order = await this.orders.findOne({
            where: { id },
            ...WITH_ITEMS,
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    /** Guests look an order up with its number and the email it was placed with. */
    async track({ orderNumber, email }: TrackOrderDto) {
        const order = await this.orders.findOne({
            where: {
                orderNumber: orderNumber.trim().toUpperCase(),
                email: email.trim().toLowerCase(),
            },
            ...WITH_ITEMS,
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    /** A signed in customer's own orders, newest first. */
    async findMine(
        user: User,
        { page, limit }: ListOrdersDto
    ): Promise<Paginated<Order>> {
        const [items, total] = await this.orders.findAndCount({
            where: { userId: user.id },
            relations: { items: true },
            order: { createdAt: 'DESC', id: 'DESC', items: { id: 'ASC' } },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, total, page, limit };
    }

    async findAll({
        page,
        limit,
        search,
        status,
    }: ListOrdersDto): Promise<Paginated<Order & { itemCount: number }>> {
        const query = this.orders
            .createQueryBuilder('order')
            .addSelect(
                (sub) =>
                    sub
                        .select('COUNT(*)')
                        .from(OrderItem, 'item')
                        .where('item.orderId = order.id'),
                'item_count'
            )
            .orderBy('order.createdAt', 'DESC')
            .addOrderBy('order.id', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            query.andWhere(
                `(order.orderNumber ILIKE :search ESCAPE '\\' OR order.fullName ILIKE :search ESCAPE '\\' OR order.email ILIKE :search ESCAPE '\\' OR order.phone ILIKE :search ESCAPE '\\')`,
                { search: `%${escapeLike(search)}%` }
            );
        }
        if (status) query.andWhere('order.status = :status', { status });

        const { entities, raw } = await query.getRawAndEntities();
        const total = await query.getCount();
        // No joins, so raw rows line up one to one with the entities
        const items = entities.map((order, index) =>
            Object.assign(order, { itemCount: Number(raw[index].item_count) })
        );
        return { items, total, page, limit };
    }

    /** Admin: move the order along, or mark it paid. Cancelling puts the stock back. */
    async update(id: number, dto: UpdateOrderDto, userId: number) {
        await this.dataSource.transaction(async (manager) => {
            const order = await this.lock(manager, { id });
            if (dto.status && dto.status !== order.status) {
                await this.changeStatus(manager, order, dto.status, userId);
                // Cash is collected when the parcel is handed over
                if (
                    dto.status === OrderStatus.DELIVERED &&
                    dto.paymentStatus === undefined
                ) {
                    order.paymentStatus = PaymentStatus.PAID;
                }
            }
            if (dto.paymentStatus !== undefined) {
                if (
                    order.status === OrderStatus.CANCELLED &&
                    dto.paymentStatus === PaymentStatus.PAID
                ) {
                    throw new BadRequestException(
                        'A cancelled order cannot be marked as paid'
                    );
                }
                order.paymentStatus = dto.paymentStatus;
            }
            await manager.save(order);
        });
        return this.findOne(id);
    }

    /** Customer: cancel their own order while it is still pending. */
    async cancelMine(user: User, orderNumber: string) {
        const id = await this.dataSource.transaction(async (manager) => {
            const order = await this.lock(manager, {
                orderNumber: orderNumber.toUpperCase(),
                userId: user.id,
            });
            if (order.status !== OrderStatus.PENDING) {
                throw new BadRequestException(
                    'Only pending orders can be cancelled, please contact us'
                );
            }
            await this.changeStatus(
                manager,
                order,
                OrderStatus.CANCELLED,
                user.id
            );
            await manager.save(order);
            return order.id;
        });
        return this.findOne(id);
    }

    /** Row lock so two cancels of the same order cannot both put the stock back. */
    private async lock(manager: EntityManager, where: FindOptionsWhere<Order>) {
        const order = await manager.findOne(Order, {
            where,
            lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    private async changeStatus(
        manager: EntityManager,
        order: Order,
        status: OrderStatus,
        userId: number
    ) {
        if (!NEXT_STATUS[order.status].includes(status)) {
            throw new BadRequestException(
                `An order cannot go from ${order.status} to ${status}`
            );
        }
        if (status === OrderStatus.CANCELLED) {
            const items = await manager.find(OrderItem, {
                where: { orderId: order.id },
                order: { productId: 'ASC' },
            });
            for (const item of items) {
                // productId is null when the product was deleted, nothing to put back then
                if (item.productId === null) continue;
                await this.stock.applyMovement(
                    manager,
                    item.productId,
                    item.quantity,
                    StockMovementType.RETURN,
                    `Order ${order.orderNumber} cancelled`,
                    userId
                );
            }
        }
        order.status = status;
    }
}
