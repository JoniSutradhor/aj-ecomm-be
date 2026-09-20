import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockController } from './stock.controller';
import { StockMovement } from './stock-movement.entity';
import { StockService } from './stock.service';

@Module({
    imports: [TypeOrmModule.forFeature([StockMovement])],
    controllers: [StockController],
    providers: [StockService],
    exports: [StockService],
})
export class StockModule {}
