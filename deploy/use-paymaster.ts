import { ContractFactory, Provider, utils, Wallet } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

require("dotenv").config();

// load wallet private key from env file
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";

if (!PRIVATE_KEY)
    throw "⛔️ Private key not detected! Add it to the .env file!";

// Put the address of the deployed paymaster and the Greeter Contract in the .env file
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS || "";
const GREETER_CONTRACT_ADDRESS = process.env.GREETER_CONTRACT || "";

// Put the address of the ERC20 token in the .env file:
const TOKEN_ADDRESS = process.env.FUN_TOKEN_ADDRESS || "";
const GREETER_ADDRESS = process.env.GREETER_ADDRESS || "";

const L1_RPC_ENDPOINT = "http://localhost:8545";
const L2_RPC_ENDPOINT = "http://localhost:3050";

function getToken(hre: HardhatRuntimeEnvironment, wallet: Wallet, token_address:string) {
    const artifact = hre.artifacts.readArtifactSync("FunToken");
    return new ethers.Contract(token_address, artifact.abi, wallet);
}

// Greeter contract
function getGreeter(hre: HardhatRuntimeEnvironment, wallet: Wallet) {
    const artifact = hre.artifacts.readArtifactSync("Greeter");
    return new ethers.Contract(GREETER_ADDRESS, artifact.abi, wallet);
}

// Wallet private key
// ⚠️ Never commit private keys to file tracking history, or your account could be compromised.
const EMPTY_WALLET_PRIVATE_KEY = process.env.EMPTY_WALLET_PRIVATE_KEY || "";
export default async function (hre: HardhatRuntimeEnvironment) {
    const provider = new Provider(L2_RPC_ENDPOINT);
    const wallet = new Wallet(PRIVATE_KEY, provider);
    const emptyWallet = new Wallet(EMPTY_WALLET_PRIVATE_KEY, provider);

    // const emptyWallet2 = Wallet.createRandom();
    // console.log(`Empty wallet's address: ${emptyWallet.address}`);
    // console.log(`Empty wallet's private key: ${emptyWallet.privateKey}`);
    // const emptyWallet3 = new Wallet(emptyWallet.privateKey, provider);

    // Obviously this step is not required, but it is here purely to demonstrate that indeed the wallet has no ether.
    const ethBalance = await emptyWallet.getBalance();
    if (!ethBalance.eq(0)) {
        throw new Error("The wallet is not empty");
    }

    const l2FunToken = await provider.l2TokenAddress(TOKEN_ADDRESS);
    console.log('l2FunToken :' ,l2FunToken);

    const balance = await wallet.getBalance();
    console.log(`ETH balance of the user before tx: ${balance}`);

    const erc20Balance = await wallet.getBalance(l2FunToken);
    console.log(`ERC20 balance of the user before tx: ${erc20Balance}`);


    const greeter = getGreeter(hre, wallet);
    const erc20 = getToken(hre, wallet, l2FunToken);

    const gasPrice = await provider.getGasPrice();

    // Loading the Paymaster Contract
    const deployer = new Deployer(hre, wallet);
    const paymasterArtifact = await deployer.loadArtifact("MyPaymaster");

    const PaymasterFactory = new ContractFactory(paymasterArtifact.abi, paymasterArtifact.bytecode, deployer.zkWallet);
    const PaymasterContract = PaymasterFactory.attach(PAYMASTER_ADDRESS);
    console.log('PAYMASTER_ADDRESS : ', PAYMASTER_ADDRESS)
    // console.log('greeter : ', greeter)

    // Deploying the ERC20 token
    const erc20Artifact = await deployer.loadArtifact("TestnetERC20Token");
    const erc20_1 = await deployer.deploy(erc20Artifact, ["MyToken", "MyToken", 18]);
    console.log(`ERC20 address: ${erc20_1.address}`);
    //0x0a1cadfaBa9F633939d254160303ae58E25aa642
    //0xf43624d811c5DC9eF91cF237ab9B8eE220D438eE

    // Estimate gas fee for the transaction
    const gasLimit = await greeter.estimateGas.setGreeting("new updated greeting", {
        customData: {
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
            paymasterParams: utils.getPaymasterParams(PAYMASTER_ADDRESS, {
                type: "ApprovalBased",
                token: erc20_1.address,
                // Set a large allowance just for estimation
                minimalAllowance: ethers.BigNumber.from(`100000000000000000000`),
                // Empty bytes as testnet paymaster does not use innerInput
                innerInput: new Uint8Array(),
            }),
        },
    });

    // Gas estimation:
    const fee = gasPrice.mul(gasLimit.toString());
    console.log(`Estimated ETH FEE (gasPrice * gasLimit): ${fee}`);

    // Checks old allowance (for testing purposes):
    const checkSetAllowance = await erc20.allowance(emptyWallet.address, PAYMASTER_ADDRESS);
    console.log(`ERC20 allowance for paymaster : ${checkSetAllowance}`);

    console.log(`Current message is: ${await greeter.greet()}`);

    // Encoding the "ApprovalBased" paymaster flow's input
    const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
        type: "ApprovalBased",
        token: l2FunToken,
        // set minimalAllowance to the estimated fee in erc20
        minimalAllowance: ethers.BigNumber.from(100000000000000),
        // empty bytes as testnet paymaster does not use innerInput
        innerInput: new Uint8Array()
    });
    console.log('paymasterParams :', paymasterParams);
    const tx = await greeter.connect(wallet).setGreeting("new updated greeting", {
        maxFeePerGas: gasPrice,
        maxPriorityFeePerGas: ethers.BigNumber.from(0),
        gasLimit: gasLimit,
        customData: {
            paymasterParams: paymasterParams,
            gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        },
    })
    console.log('tx :', tx);
    const re = await tx.wait();
    console.log('---------', re);

    const newErc20Balance = await emptyWallet.getBalance(l2FunToken);

    console.log(`ERC20 Balance of the user after tx: ${newErc20Balance}`);
    console.log(`Transaction fee paid in ERC20 was ${erc20Balance.sub(newErc20Balance)}`);
    console.log(`Message in contract now is: ${await greeter.greet()}`);
}
