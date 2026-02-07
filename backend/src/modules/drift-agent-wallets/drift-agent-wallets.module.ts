import { Module } from '@nestjs/common';
import { AgentWalletsService } from './services/agent-wallets.service';
import { AgentWalletsController } from './controllers/agent-wallets.controller';
import { CryptoService } from './services/crypto.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AgentWalletsController],
  providers: [AgentWalletsService, CryptoService],
  exports: [AgentWalletsService, CryptoService],
})
export class AgentWalletsModule {}
