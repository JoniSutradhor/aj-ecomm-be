import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { StockMovementType } from '../stock-movement.entity';

export class ListMovementsDto extends PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    productId?: number;

    @IsOptional()
    @IsEnum(StockMovementType)
    type?: StockMovementType;
}
