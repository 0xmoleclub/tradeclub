import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTestBattleDto {
  @ApiPropertyOptional({
    description: 'Number of mock players to create (2–4)',
    default: 2,
    minimum: 2,
    maximum: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(4)
  playerCount?: number = 2;

  @ApiPropertyOptional({
    description: 'Optional matchId override (UUID or arbitrary string)',
  })
  @IsOptional()
  @IsString()
  matchId?: string;
}

export class FinishTestBattleDto {
  @ApiPropertyOptional({
    description:
      'Zero-based outcome index (slot - 1) of the winning player. Defaults to 0.',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  winnerOutcome?: number = 0;
}
