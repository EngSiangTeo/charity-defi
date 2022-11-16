import { Wallet, Provider, utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the paymaster contract`);

  // Initialize the wallet.
  const provider = new Provider(hre.userConfig.zkSyncDeploy?.zkSyncNetwork);
  // The wallet that will deploy the token and the paymaster
  // It is assumed that this wallet already has sufficient funds on zkSync
  const wallet = new Wallet("");
  // The wallet that will receive ERC20 tokens
  const emptyWallet = Wallet.createRandom();
  console.log(`Empty wallet's address: ${emptyWallet.address}`);
  console.log(`Empty wallet's private key: ${emptyWallet.privateKey}`);

  const deployer = new Deployer(hre, wallet);

  // Deploying the ERC20 token
  const erc20Artifact = await deployer.loadArtifact("CharityToken");
  const erc20 = await deployer.deploy(erc20Artifact, ["CharityToken", "CToken", 2]);
  console.log(`ERC20 address: ${erc20.address}`);

  // Deploying the paymaster
  const paymasterArtifact = await deployer.loadArtifact("MyPaymaster");
  const paymaster = await deployer.deploy(paymasterArtifact, [erc20.address]);
  console.log(`Paymaster address: ${paymaster.address}`);

  // Supplying paymaster with ETH
  await (
    await deployer.zkWallet.sendTransaction({
      to: paymaster.address,
      value: ethers.utils.parseEther("0.02"),
    })
  ).wait();

  // await
  // (await erc20.mint(emptyWallet.address, 100)).wait();

  await
  (await erc20.mint(wallet.address, 100)).wait();

  console.log(`Done!`);
}
