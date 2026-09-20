import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListMovementsDto } from './dto/list-movements.dto';
import { StockService } from './stock.service';

/** Current stock levels per product come from `GET /admin/products` (`lowStock` filter). */
@Roles(UserRole.ADMIN)
@Controller('admin/stock')
export class StockController {
    constructor(private readonly stock: StockService) {}

    @Get('summary')
    summary() {
        return this.stock.summary();
    }

    @Get('movements')
    movements(@Query() query: ListMovementsDto) {
        return this.stock.listMovements(query);
    }

    @Post('adjust')
    adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: User) {
        return this.stock.adjust(dto, user.id);
    }
}
