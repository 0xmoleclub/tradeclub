import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAgentDto {
  @ApiProperty({ example: 'AlphaBot', description: 'Agent display name' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'eip155:1:0x742...', description: 'ERC-8004 identity registry' })
  @IsString()
  identityRegistry!: string;

  @ApiPropertyOptional({ example: 'ipfs://Qm...', description: 'Agent registration URI' })
  @IsOptional()
  @IsString()
  agentURI?: string;

  @ApiPropertyOptional({ description: 'Agent service endpoints (MCP, A2A, etc)' })
  @IsOptional()
  @IsObject()
  endpoints?: Record<string, string>;

  @ApiPropertyOptional({ example: ['reputation', 'tee-attestation'], description: 'Supported trust models' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedTrust?: string[];
}
