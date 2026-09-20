import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Roles(UserRole.ADMIN)
@Controller('admin/orders')
export class OrdersController {
    constructor(private readonly orders: OrdersService) {}

    @Get()
    findAll(@Query() query: ListOrdersDto) {
        return this.orders.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.orders.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrderDto,
        @CurrentUser() user: User
    ) {
        return this.orders.update(id, dto, user.id);
    }
}
