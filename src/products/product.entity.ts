import {
    Check,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { decimalTransformer } from '../common/decimal.transformer';

export enum ProductStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    ARCHIVED = 'archived',
}

@Entity('products')
@Check('"stockQuantity" >= 0')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    slug: string;

    @Column({ unique: true })
    sku: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        transformer: decimalTransformer,
    })
    price: number;

    /** Original price shown struck through when the product is on sale. */
    @Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        nullable: true,
        transformer: decimalTransformer,
    })
    compareAtPrice: number | null;

    @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
    status: ProductStatus;

    @Column({ type: 'text', array: true, default: () => "'{}'" })
    images: string[];

    /** Only changed through StockService, never by editing the product. */
    @Column({ type: 'int', default: 0 })
    stockQuantity: number;

    /** At or below this quantity the product counts as low on stock. */
    @Column({ type: 'int', default: 5 })
    lowStockThreshold: number;

    @Index()
    @Column({ type: 'int', nullable: true })
    categoryId: number | null;

    @ManyToOne(() => Category, { nullable: true, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'categoryId' })
    category: Category | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
