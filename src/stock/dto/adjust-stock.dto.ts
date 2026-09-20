import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    NotEquals,
} from 'class-validator';
import { StockMovementType } from '../stock-movement.entity';

/** Types an admin can record by hand. INITIAL and SALE are written by the system. */
export const MANUAL_MOVEMENT_TYPES = [
    StockMovementType.RESTOCK,
    StockMovementType.ADJUSTMENT,
    StockMovementType.DAMAGE,
    StockMovementType.RETURN,
] as const;

export class AdjustStockDto {
    @IsInt()
    productId: number;

    @IsIn(MANUAL_MOVEMENT_TYPES)
    type: (typeof MANUAL_MOVEMENT_TYPES)[number];

    /** Signed change. RESTOCK / RETURN must be positive, DAMAGE negative, ADJUSTMENT either. */
    @IsInt()
    @NotEquals(0)
    delta: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
