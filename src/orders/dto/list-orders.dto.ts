import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { OrderStatus } from '../order.entity';

export class ListOrdersDto extends PaginationDto {
    /** Matches order number, name, email or phone. */
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}
