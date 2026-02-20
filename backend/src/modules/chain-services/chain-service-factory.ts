import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChainConfig } from '@config/chain.config';
import { AbstractConstructor } from './chain-service.types';
import { ChainServiceRegistry } from './chain-service-registry';

@Injectable()
export class ChainServiceFactory {
  constructor(
    private readonly registry: ChainServiceRegistry,
    private readonly configService: ConfigService,
  ) {}

  getCurrent<T>(serviceType: AbstractConstructor<T>): T {
    const chain = this.getChainConfig();
    return this.registry.get(serviceType, chain.current);
  }

  getForChain<T>(serviceType: AbstractConstructor<T>, chainKey: string): T {
    return this.registry.get(serviceType, chainKey);
  }

  private getChainConfig(): ChainConfig {
    const chain = this.configService.get<ChainConfig>('chain');
    if (!chain) {
      throw new Error('Missing chain configuration');
    }
    return chain;
  }
}
