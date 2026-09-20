import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';

export class OrderItemInputDto {
    @Type(() => Number)
    @IsInt()
    productId: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(99)
    quantity: number;
}

/** Prices always come from the database, the client only says what and how many. */
export class PlaceOrderDto {
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => OrderItemInputDto)
    items: OrderItemInputDto[];

    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    fullName: string;

    @IsEmail()
    @MaxLength(254)
    email: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    phone: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    addressLine: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    city: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}
