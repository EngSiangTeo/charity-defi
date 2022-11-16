import { Wallet, Provider, utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the CampaignAdmin contract`);

  // Initialize the wallet.
  const provider = new Provider(hre.userConfig.zkSyncDeploy?.zkSyncNetwork);
  const wallet = new Wallet("");

  // Create deployer object and load the artifact of the contract you want to deploy.
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer.loadArtifact("CampaignAdmin");

  // Estimate contract deployment fee
  const deploymentFee = await deployer.estimateDeployFee(artifact, []);

  // // Deposit funds to L2
  // const depositHandle = await deployer.zkWallet.deposit({
  //   to: deployer.zkWallet.address,
  //   token: utils.ETH_ADDRESS,
  //   amount: deploymentFee.mul(2),
  // });
  // // Wait until the deposit is processed on zkSync
  // await depositHandle.wait();

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  // `greeting` is an argument for contract constructor.
  const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
  console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

  const compaignAdminContract = await deployer.deploy(artifact, []);

  // Show the contract info.
  const contractAddress = compaignAdminContract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);
}

