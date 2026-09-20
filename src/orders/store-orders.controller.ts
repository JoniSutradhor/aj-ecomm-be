import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../users/user.entity';
import { ListOrdersDto } from './dto/list-orders.dto';
import { PlaceOrderDto } from './dto/place-order.dto';
import { TrackOrderDto } from './dto/track-order.dto';
import { OrdersService } from './orders.service';

@Controller('store/orders')
export class StoreOrdersController {
    constructor(private readonly orders: OrdersService) {}

    /** Guests and signed in customers. A valid token links the order to the account. */
    @Public()
    @Post()
    place(@Body() dto: PlaceOrderDto, @CurrentUser() user: User | null) {
        return this.orders.place(dto, user);
    }

    @Public()
    @Get('track')
    track(@Query() query: TrackOrderDto) {
        return this.orders.track(query);
    }

    @Get('mine')
    findMine(@CurrentUser() user: User, @Query() query: ListOrdersDto) {
        return this.orders.findMine(user, query);
    }

    @Patch(':orderNumber/cancel')
    cancel(
        @CurrentUser() user: User,
        @Param('orderNumber') orderNumber: string
    ) {
        return this.orders.cancelMine(user, orderNumber);
    }
}
