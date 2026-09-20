import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/decimal.transformer';
import { Product } from '../products/product.entity';
import { Order } from './order.entity';

/** A line of an order. Name, sku and price are copied so the order survives product edits and deletes. */
@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    orderId: number;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'orderId' })
    order: Order;

    /** Null once the product has been deleted. */
    @Column({ type: 'int', nullable: true })
    productId: number | null;

    @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'productId' })
    product: Product | null;

    @Column()
    name: string;

    @Column()
    sku: string;

    @Column({ type: 'varchar', nullable: true })
    image: string | null;

    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        transformer: decimalTransformer,
    })
    unitPrice: number;

    @Column({ type: 'int' })
    quantity: number;

    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        transformer: decimalTransformer,
    })
    lineTotal: number;
}
