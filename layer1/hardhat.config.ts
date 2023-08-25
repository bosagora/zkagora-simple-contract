import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  networks:{
    local_geth: {
      url: 'http://127.0.0.1:8545',
      accounts: ['0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110']
    }
  },
  solidity: "0.8.19",
};

export default config;
