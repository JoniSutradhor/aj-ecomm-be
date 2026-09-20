import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

export enum StockMovementType {
    /** Stock entered when the product was created. */
    INITIAL = 'initial',
    /** New units received from a supplier. */
    RESTOCK = 'restock',
    /** Manual correction, e.g. after a stock count. */
    ADJUSTMENT = 'adjustment',
    /** Units lost, broken or expired. */
    DAMAGE = 'damage',
    /** Units returned by a customer. */
    RETURN = 'return',
    /** Units sold through an order. */
    SALE = 'sale',
}

/** Append only ledger. `Product.stockQuantity` is always the sum of its movements. */
@Entity('stock_movements')
@Index(['productId', 'createdAt'])
export class StockMovement {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    productId: number;

    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product: Product;

    @Column({ type: 'enum', enum: StockMovementType })
    type: StockMovementType;

    /** Signed change: positive adds units, negative removes them. */
    @Column({ type: 'int' })
    delta: number;

    @Column({ type: 'int' })
    quantityAfter: number;

    @Column({ type: 'text', nullable: true })
    reason: string | null;

    @Column({ type: 'int', nullable: true })
    userId: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: User | null;

    @CreateDateColumn()
    createdAt: Date;
}
