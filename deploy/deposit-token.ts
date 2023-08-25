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

const L1_RPC_ENDPOINT = "http://localhost:8545";
const L2_RPC_ENDPOINT = "http://localhost:3050";

const FUN_TOKEN_ADDRESS =  process.env.FUN_TOKEN_ADDRESS;
// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the Greeter contract`);

  // Initialize the wallet.
  const l1provider = new Provider(L1_RPC_ENDPOINT);
  const l2provider = new Provider(L2_RPC_ENDPOINT);
  const wallet = new Wallet(PRIVATE_KEY, l2provider, l1provider);

  let l1_fun_balance = await l1provider.getBalance(wallet.address, null,FUN_TOKEN_ADDRESS);
  console.log(`L1 token Balance is ${l1_fun_balance}`);


  // retrieve L1 gas price
  const l1GasPrice = await l1provider.getGasPrice();
  console.log(`L1 gasPrice ${ethers.utils.formatEther(l1GasPrice)} ETH`);


  const l2FunToken = await l2provider.l2TokenAddress(FUN_TOKEN_ADDRESS);
  console.log('l2FunToken :' ,l2FunToken); // 0x15Fa11b03E4410f323de81bC3a53DC074dF7E2f4

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer = new Deployer(hre, wallet);

  // ⚠️ OPTIONAL: You can skip this block if your account already has funds in L2
  // Deposit funds to L2
  const depositHandle = await deployer.zkWallet.deposit({
    token: FUN_TOKEN_ADDRESS,
    amount: ethers.utils.parseEther('20000'),
    approveERC20: true,
  });
  // Wait until the deposit is processed on zkSync
  await depositHandle.wait();

  console.log('====== After deposit');
  l1_fun_balance = await l1provider.getBalance(wallet.address, null,FUN_TOKEN_ADDRESS);
  const l2_fun_balance = await l2provider.getBalance(wallet.address, null,l2FunToken);
  console.log(`L1 token Balance is ${l1_fun_balance}`);
  console.log(`L2 token Balance is ${l2_fun_balance}`);

}
