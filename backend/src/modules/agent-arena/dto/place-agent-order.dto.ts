import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceAgentOrderDto {
  @ApiProperty({ example: 'BTC' })
  @IsString()
  coin!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isBuy!: boolean;

  @ApiProperty({ example: '0.1' })
  @IsString()
  size!: string;

  @ApiPropertyOptional({ example: '65000.5' })
  @IsOptional()
  @IsString()
  limitPrice?: string;
}
