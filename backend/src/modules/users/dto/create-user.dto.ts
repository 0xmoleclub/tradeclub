import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER, description: 'User role' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  role?: UserRole;
}
