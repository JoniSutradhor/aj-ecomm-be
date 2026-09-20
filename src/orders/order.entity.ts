import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../common/decimal.transformer';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

export enum PaymentMethod {
    /** Cash on delivery. */
    COD = 'cod',
}

export enum PaymentStatus {
    UNPAID = 'unpaid',
    PAID = 'paid',
}

const money = {
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
} as const;

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    /** Public reference shown to the customer, e.g. AJ-000042. */
    @Column({ unique: true })
    orderNumber: string;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.COD })
    paymentMethod: PaymentMethod;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.UNPAID,
    })
    paymentStatus: PaymentStatus;

    /** Set when a signed in customer placed the order, null for guests. */
    @Index()
    @Column({ type: 'int', nullable: true })
    userId: number | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'userId' })
    user: User | null;

    @Column()
    fullName: string;

    @Index()
    @Column()
    email: string;

    @Column()
    phone: string;

    @Column()
    addressLine: string;

    @Column()
    city: string;

    @Column({ type: 'varchar', nullable: true })
    postalCode: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ ...money })
    subtotal: number;

    @Column({ ...money })
    shippingFee: number;

    @Column({ ...money })
    total: number;

    @OneToMany(() => OrderItem, (item) => item.order)
    items: OrderItem[];

    @Index()
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
