import { IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLeverageDto {
  @ApiProperty({ description: 'Asset symbol (e.g., BTC, ETH)', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Leverage value (e.g., 5 for 5x)', example: 5 })
  @IsNumber()
  leverage: number;

  @ApiProperty({ description: 'Is cross margin (true) or isolated (false)', default: true })
  @IsBoolean()
  isCross: boolean;
}
