import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Order ID to cancel',
    example: 12345,
  })
  @IsInt()
  @Min(0)
  orderId: number;
}
