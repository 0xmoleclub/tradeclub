import 'dotenv/config';
// Side-effect import: registers the type augmentation for NetworkConnection.ethers
import '@nomicfoundation/hardhat-ethers';
import hre from 'hardhat';
import { parseUnits } from 'ethers';

const DEFAULTS = {
  disputeWindow: 60 * 60, // 1 hour
  bondAmount: '1',
  bondToken: '0xD5F6fD97280E44A7A71b751F6d1e0ad101B07A4D', // Arbitrum Sepolia USDC
  bondTokenDecimals: 6,
};

const getEnv = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
};

const getEnvAddress = (key: string, fallback: string): string => {
  return getEnv(key) ?? fallback;
};

const getNumber = (key: string, fallback: number): number => {
  const value = getEnv(key);
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for ${key}: ${value}`);
  }
  return parsed;
};

async function main() {
  // Hardhat v3: connect() returns a NetworkConnection; the hardhat-ethers plugin
  // augments it with a .ethers helper (getSigners, getContractFactory, provider…)
  const connection = await hre.network.connect();
  const ethers = connection.ethers;

  const [defaultSigner] = await ethers.getSigners();
  const privateKey = getEnv('DEPLOYER_PRIVATE_KEY');
  const deployer = privateKey
    ? await ethers.provider.getSigner(
        new (await import('ethers')).Wallet(privateKey).address,
      )
    : defaultSigner;
  const deployerAddress = await deployer.getAddress();

  const bondToken = getEnvAddress('BOND_TOKEN_ADDRESS', DEFAULTS.bondToken);
  const proposerSigner = getEnvAddress('PROPOSER_SIGNER', deployerAddress);
  const feeCollector = getEnvAddress('FEE_COLLECTOR', deployerAddress);
  const factoryOwner = getEnvAddress('FACTORY_OWNER', deployerAddress);
  const usdc = getEnvAddress('USDC_ADDRESS', bondToken);

  const disputeWindow = getNumber('DISPUTE_WINDOW', DEFAULTS.disputeWindow);
  const bondTokenDecimals = getNumber(
    'BOND_TOKEN_DECIMALS',
    DEFAULTS.bondTokenDecimals,
  );
  const bondAmountRaw = getEnv('BOND_AMOUNT') ?? DEFAULTS.bondAmount;
  const bondAmount = parseUnits(bondAmountRaw, bondTokenDecimals);

  if (bondToken === deployerAddress) {
    console.warn('BOND_TOKEN_ADDRESS not set; using deployer address.');
  }
  if (usdc === deployerAddress) {
    console.warn('USDC_ADDRESS not set; using deployer address.');
  }

  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name}`);
  console.log(`Deployer: ${deployerAddress}`);

  // Deploy MatchSettlement
  const MatchSettlement = await ethers.getContractFactory(
    'MatchSettlement',
    deployer,
  );
  const matchSettlement = await MatchSettlement.deploy(
    bondToken,
    disputeWindow,
    bondAmount,
    proposerSigner,
  );
  await matchSettlement.waitForDeployment();

  // Deploy PredictionMarket implementation
  const PredictionMarket = await ethers.getContractFactory(
    'PredictionMarket',
    deployer,
  );
  const predictionMarket = await PredictionMarket.deploy();
  await predictionMarket.waitForDeployment();

  // Deploy MarketFactory
  const MarketFactory = await ethers.getContractFactory(
    'MarketFactory',
    deployer,
  );
  const marketFactory = await MarketFactory.deploy(
    factoryOwner,
    await predictionMarket.getAddress(),
    usdc,
    await matchSettlement.getAddress(),
    feeCollector,
  );
  await marketFactory.waitForDeployment();

  console.log('Deployment complete:');
  console.log(`MatchSettlement:         ${await matchSettlement.getAddress()}`);
  console.log(
    `PredictionMarket (impl): ${await predictionMarket.getAddress()}`,
  );
  console.log(`MarketFactory:           ${await marketFactory.getAddress()}`);

  await connection.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
