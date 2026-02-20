import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChainServiceFactory } from './chain-service-factory';
import { ChainServiceRegistry } from './chain-service-registry';

@Module({
  imports: [ConfigModule],
  providers: [ChainServiceRegistry, ChainServiceFactory],
  exports: [ChainServiceRegistry, ChainServiceFactory],
})
export class ChainServicesModule {}
