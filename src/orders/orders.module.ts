import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockModule } from '../stock/stock.module';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StoreOrdersController } from './store-orders.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Order, OrderItem]), StockModule],
    controllers: [OrdersController, StoreOrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}
