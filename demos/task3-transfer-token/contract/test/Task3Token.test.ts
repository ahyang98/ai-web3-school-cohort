import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Task3Token", function () {
  let token: any;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const FAUCET_AMOUNT = ethers.parseEther("100");

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Task3Token");
    token = await Token.deploy();
    await token.waitForDeployment();
  });

  it("should deploy with correct name and symbol", async function () {
    expect(await token.name()).to.equal("Task3 Token");
    expect(await token.symbol()).to.equal("T3T");
  });

  it("should mint initial supply to deployer", async function () {
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY);
  });

  it("should allow transfer between accounts", async function () {
    const amount = ethers.parseEther("100");
    await token.transfer(alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.equal(amount);
    expect(await token.balanceOf(deployer.address)).to.equal(INITIAL_SUPPLY - amount);
  });

  it("should revert transfer when balance insufficient", async function () {
    const amount = ethers.parseEther("9999999");
    await expect(
      token.connect(alice).transfer(bob.address, amount)
    ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
  });

  it("should allow anyone to call faucet", async function () {
    await token.connect(alice).faucet();
    expect(await token.balanceOf(alice.address)).to.equal(FAUCET_AMOUNT);
  });

  it("faucet should mint exactly 100 T3T", async function () {
    await token.connect(bob).faucet();
    expect(await token.balanceOf(bob.address)).to.equal(FAUCET_AMOUNT);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + FAUCET_AMOUNT);
  });

  it("should support approve + transferFrom", async function () {
    const amount = ethers.parseEther("50");
    await token.approve(alice.address, amount);
    await token.connect(alice).transferFrom(deployer.address, bob.address, amount);
    expect(await token.balanceOf(bob.address)).to.equal(amount);
  });
});
