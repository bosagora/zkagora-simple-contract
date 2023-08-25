import { Wallet, utils, Provider } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// load env file
import dotenv from "dotenv";
dotenv.config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
  throw "⛔️ Private key not detected! Add it to the .env file!";

const L2_RPC_ENDPOINT = "http://localhost:3050";
const FUN_TOKEN_ADDRESS =  process.env.FUN_TOKEN_ADDRESS;

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the Greeter contract`);

  // Initialize the wallet.
  const zkSyncProvider = new Provider(L2_RPC_ENDPOINT);
  const zkSyncWallet = new Wallet(PRIVATE_KEY, zkSyncProvider);

  // Store the recipient public key // empty wallet
  const receiverWallet = "0xb56FebB4D763adA89bFb55aFC45627D2C491c21D";

  console.log(`L2 Balance is ${await zkSyncWallet.getBalance()}`);

  const l2FunToken = await zkSyncProvider.l2TokenAddress(FUN_TOKEN_ADDRESS);
  const amount = ethers.BigNumber.from("1000000000000000000");

  //Show the balance of wallets before transferring
  console.log(`FROM this L2 wallet: "${ethers.utils.formatUnits(await zkSyncProvider.getBalance(zkSyncWallet.address, "latest", l2FunToken), 18)}" FUN`);
  console.log(`TO receiver wallet: "${ethers.utils.formatUnits(await zkSyncProvider.getBalance(receiverWallet, "latest", l2FunToken), 18)}" FUN`);

  const transfer = await zkSyncWallet.transfer({
    to: receiverWallet,
    token: l2FunToken,
    amount,
  });

  // Await commitment
  const transferReceipt = await transfer.wait();
  console.log(`Tx transfer hash for DAI: ${transferReceipt.blockHash}`);

  // Show the balance of wallets after transferring
  console.log(`FROM this L2 wallet: "${ethers.utils.formatUnits(await zkSyncProvider.getBalance(zkSyncWallet.address, "latest", l2FunToken), 18)}" FUN`);
  console.log(`TO receiver wallet: "${ethers.utils.formatUnits(await zkSyncProvider.getBalance(receiverWallet, "latest", l2FunToken), 18)}" FUN`);


}
