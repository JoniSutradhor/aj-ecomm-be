import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { ProductStatus } from '../product.entity';

export class ListProductsDto extends PaginationDto {
    /** Matches name or sku. */
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    categoryId?: number;

    /** Only products at or below their low stock threshold (includes out of stock). */
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    lowStock?: boolean;
}
