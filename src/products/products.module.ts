import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockModule } from '../stock/stock.module';
import { Product } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { StoreProductsController } from './store-products.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Product]), StockModule],
    controllers: [ProductsController, StoreProductsController],
    providers: [ProductsService],
    exports: [ProductsService],
})
export class ProductsModule {}
