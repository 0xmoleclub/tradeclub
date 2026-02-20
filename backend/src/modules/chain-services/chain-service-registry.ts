import { Injectable } from '@nestjs/common';
import { AbstractConstructor } from './chain-service.types';

@Injectable()
export class ChainServiceRegistry {
  private readonly registry = new Map<
    AbstractConstructor<any>,
    Map<string, any>
  >();

  register<T>(
    serviceType: AbstractConstructor<T>,
    chainKey: string,
    instance: T,
  ) {
    const byChain = this.registry.get(serviceType) ?? new Map<string, T>();
    byChain.set(chainKey, instance);
    this.registry.set(serviceType, byChain);
  }

  get<T>(serviceType: AbstractConstructor<T>, chainKey: string): T {
    const byChain = this.registry.get(serviceType);
    if (!byChain) {
      throw new Error(`No services registered for ${serviceType.name}`);
    }
    const service = byChain.get(chainKey);
    if (!service) {
      throw new Error(
        `No service registered for ${serviceType.name} on ${chainKey}`,
      );
    }
    return service;
  }
}
