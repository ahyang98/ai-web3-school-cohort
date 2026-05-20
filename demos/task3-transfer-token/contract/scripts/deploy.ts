import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const Token = await ethers.getContractFactory("Task3Token");
  const token = await Token.deploy();
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const txHash = token.deploymentTransaction()?.hash;

  console.log("✓ 合约 Task3Token 部署成功");
  console.log(`  地址: ${contractAddress}`);
  console.log(`  交易哈希: ${txHash}`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  初始供应量: ${ethers.formatEther(await token.totalSupply())} T3T\n`);

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify({
    contractAddress,
    deployer: deployer.address,
    txHash,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log(`ℹ️  部署信息已写入 deployment.json`);
  console.log(`\n⚠️  请将合约地址更新到 backend/config.yaml:`);
  console.log(`   contract_address: "${contractAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
