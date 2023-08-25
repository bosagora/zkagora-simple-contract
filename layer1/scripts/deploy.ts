import { ethers } from "hardhat";

async function main() {

  const [deployer] = await ethers.getSigners();
  const funToken = await ethers.deployContract("FunToken");

  const receipt = await funToken.waitForDeployment();
  console.log(`FunToken deployed to: ${funToken.target}`)
  console.log('receipt :', receipt);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
