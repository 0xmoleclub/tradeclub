import hardhatToolboxMochaEthersPlugin from '@nomicfoundation/hardhat-toolbox-mocha-ethers';
import hardhatVerify from '@nomicfoundation/hardhat-verify';
import { configVariable, defineConfig } from 'hardhat/config';
import 'dotenv/config';

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin, hardhatVerify],
  solidity: {
    profiles: {
      default: {
        version: '0.8.24',
      },
      production: {
        version: '0.8.24',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: 'edr-simulated',
      chainType: 'l1',
    },
    hardhatOp: {
      type: 'edr-simulated',
      chainType: 'op',
    },
    arbitrum: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('ARBITRUM_RPC_URL'),
      accounts: [configVariable('ARBITRUM_PRIVATE_KEY')],
    },
    arbitrum_sepolia: {
      type: 'http',
      chainType: 'l1',
      url: configVariable('ARBITRUM_SEPOLIA_RPC_URL'),
      accounts: [configVariable('ARBITRUM_SEPOLIA_PRIVATE_KEY')],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable('ETHERSCAN_API_KEY'),
    },
  },
});
