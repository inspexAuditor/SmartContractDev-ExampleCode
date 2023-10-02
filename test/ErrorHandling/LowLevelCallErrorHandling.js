const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenErrorHandling", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, bob, alice, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const LowLevelCallErrorHandlingContract = await ethers.getContractFactory("LowLevelCallErrorHandlingContract");
    const nativeBankManager = await LowLevelCallErrorHandlingContract.connect(deployer).deploy();
    const nativeBank = await ethers.getContractAt("LowLevelBank", await nativeBankManager.bank());

    const amountToDeposit = ethers.utils.parseEther("10");
    await nativeBankManager.connect(deployer).depositSafe(deployer.address, amountToDeposit, {value: amountToDeposit});

    return { nativeBankManager, nativeBank, deployer, bob, alice, attacker };
  }

  describe("Deployment", () => {
    it("Deploy TokenErrorHandling contract", async () => {
      const { nativeBankManager, nativeBank, deployer, bob, alice } = await deploy();
      expect(await nativeBankManager.balances(deployer.address) == ethers.utils.parseEther("10"));
    });
  });

  describe("Test Deposit", () => {
    it("Unsafe native token transfering", async () => {
      const { nativeBankManager, nativeBank, deployer, bob, alice, attacker } = await deploy();
      /// users deposit noRevertToken into the bank
      const amountToDeposit = ethers.utils.parseEther("10");
      await nativeBankManager.connect(bob).depositUnsafe(bob.address, amountToDeposit, {value: amountToDeposit});
      await nativeBankManager.connect(alice).depositUnsafe(alice.address, amountToDeposit, {value: amountToDeposit});
      /*
        An attacker can steal native token from the bank by following these steps:
        - deposit by sending the patameters as folowing:
          - for = attacker's address
          - amount = amountToSteal
          - msg.value = 0
        - withdraw native token, actually steal it, from the bank
      */    
      console.log(`---- Before the attack ----`);
      const balanceBefore = await ethers.provider.getBalance(attacker.address);
      console.log(`balanceOf[attacker]: ${ethers.utils.formatEther(balanceBefore)} ether`);
      /// the attack
      const amountToSteal = amountToDeposit.mul(3); /// deployer + bob + alice
      await nativeBankManager.connect(attacker).depositUnsafe(attacker.address, amountToSteal, {value:0});
      await nativeBankManager.connect(attacker).withdraw(attacker.address, amountToSteal);
      console.log(`---- After the attack ----`);
      const balanceAfter = await ethers.provider.getBalance(attacker.address);
      console.log(`balanceOf[attacker]: ${ethers.utils.formatEther(balanceAfter)} ether`);
      expect(balanceAfter > balanceBefore);
    });

    it("Safer way to transfer native token", async () => {
      const { nativeBankManager, nativeBank, deployer, bob, alice, attacker } = await deploy();
      /// users deposit noRevertToken into the bank
      const amountToDeposit = ethers.utils.parseEther("10");
      await nativeBankManager.connect(bob).depositSafe(bob.address, amountToDeposit, {value: amountToDeposit});
      await nativeBankManager.connect(alice).depositSafe(alice.address, amountToDeposit, {value: amountToDeposit});
      /*
        An attacker try to steal tokens from the bank
      */    
      const amountToSteal = amountToDeposit.mul(3); /// deployer + bob + alice
      await expect(
        nativeBankManager.connect(attacker).depositSafe(attacker.address, amountToSteal, {value:0})
      ).to.be.rejectedWith("Failed to send Ether");
    });
  });

});