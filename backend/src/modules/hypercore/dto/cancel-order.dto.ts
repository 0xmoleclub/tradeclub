import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiProperty({ description: 'Asset symbol (e.g., BTC, ETH)', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Order ID to cancel', example: 12345 })
  @IsNumber()
  orderId: number;
}
