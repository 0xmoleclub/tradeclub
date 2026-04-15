import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuySharesDto {
  @ApiProperty({ example: 0 })
  @IsNumber()
  outcome!: number;

  @ApiProperty({ example: '1000000000000000000' })
  @IsString()
  sharesWad!: string;

  @ApiProperty({ example: '1000000' })
  @IsString()
  maxCostUsdc!: string;
}
