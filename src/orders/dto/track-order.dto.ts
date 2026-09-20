import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class TrackOrderDto {
    @IsString()
    @IsNotEmpty()
    orderNumber: string;

    /** Must match the email the order was placed with. */
    @IsEmail()
    email: string;
}
