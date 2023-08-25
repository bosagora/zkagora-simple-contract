import { Wallet, utils, Provider } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";
const EMPTY_WALLET_PRIVATE_KEY = process.env.EMPTY_WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

const L1_RPC_ENDPOINT = "http://localhost:8545";
const L2_RPC_ENDPOINT = "http://localhost:3050";

const FUN_TOKEN_ADDRESS =  process.env.FUN_TOKEN_ADDRESS;

function getToken(hre: HardhatRuntimeEnvironment, wallet: Wallet) {
  const artifact = hre.artifacts.readArtifactSync("FunToken");
  return new ethers.Contract(FUN_TOKEN_ADDRESS, artifact.abi, wallet);
}
// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the Greeter contract`);

  // Initialize the wallet.
  const l1provider = new Provider(L1_RPC_ENDPOINT);
  const l2provider = new Provider(L2_RPC_ENDPOINT);
  const wallet = new Wallet(PRIVATE_KEY, l2provider, l1provider);

  console.log(`Address is ${await wallet.getAddress()}`);
  console.log(`L1 Balance is ${await wallet.getBalanceL1()}`);
  console.log(`L2 Balance is ${await wallet.getBalance()}`);

  const emptyWallet = new Wallet(EMPTY_WALLET_PRIVATE_KEY, l2provider);
  const l2FunToken = await l2provider.l2TokenAddress(FUN_TOKEN_ADDRESS);

  const deployer = new Deployer(hre, wallet);

  // Deploying the paymaster
  const paymasterArtifact = await deployer.loadArtifact("MyPaymaster");
  const paymaster = await deployer.deploy(paymasterArtifact, [l2FunToken]);
  console.log(`Paymaster address: ${paymaster.address}`);

  console.log("Funding paymaster with ETH");
  // Supplying paymaster with ETH
  await (
      await deployer.zkWallet.sendTransaction({
        to: paymaster.address,
        value: ethers.utils.parseEther("6"),
      })
  ).wait();

  let paymasterBalance = await l2provider.getBalance(paymaster.address);

  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);

}
