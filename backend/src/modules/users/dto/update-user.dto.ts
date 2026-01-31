import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../common/enums';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: UserStatus, description: 'User status' })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Invalid status' })
  status?: UserStatus;
}
