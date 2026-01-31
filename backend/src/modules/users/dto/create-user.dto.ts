import { IsEthereumAddress, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserRole, UserStatus } from '../../../common/enums';

export class CreateUserDto {
  @ApiProperty({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    description: 'Wallet address',
  })
  @IsEthereumAddress()
  @Transform(({ value }) => value?.toLowerCase())
  walletAddress: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'User display name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
