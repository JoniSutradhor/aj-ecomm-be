import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/pagination.dto';

export enum StoreProductSort {
    NEWEST = 'newest',
    PRICE_ASC = 'price_asc',
    PRICE_DESC = 'price_desc',
    NAME = 'name',
}

export class ListStoreProductsDto extends PaginationDto {
    /** Matches name or description. */
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    categoryId?: number;

    @IsOptional()
    @IsEnum(StoreProductSort)
    sort: StoreProductSort = StoreProductSort.NEWEST;
}
