import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { ProductStatus } from '../product.entity';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    sku: string;

    @IsOptional()
    @IsString()
    @MaxLength(10000)
    description?: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    compareAtPrice?: number;

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @IsString({ each: true })
    images?: string[];

    @IsOptional()
    @IsInt()
    @Min(0)
    lowStockThreshold?: number;

    @IsOptional()
    @IsInt()
    categoryId?: number;

    /** Creates an INITIAL stock movement. After that use the stock endpoints. */
    @IsOptional()
    @IsInt()
    @Min(0)
    initialStock?: number;
}
