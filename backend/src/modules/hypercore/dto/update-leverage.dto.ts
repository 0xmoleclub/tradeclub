import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLeverageDto {
  @ApiProperty({ description: 'Asset symbol (e.g., BTC, ETH)', example: 'BTC' })
  @IsString()
  coin: string;

  @ApiProperty({ description: 'Leverage value (e.g., 5 for 5x)', example: 5 })
  @IsNumber()
  leverage: number;

  @ApiProperty({ description: 'Always isolated margin (isolated-only perpetuals)', default: false, required: false })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value === 'true';
    return Boolean(value);
  })
  @IsBoolean()
  @IsOptional()
  isCross?: boolean;
}
