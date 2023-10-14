const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenErrorHandling", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, beneficiary, bob, alice, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const TokenErrorHandlingContract = await ethers.getContractFactory("TokenErrorHandlingContract");
    const tokenBank = await TokenErrorHandlingContract.connect(deployer).deploy();

    const NoRevertToken = await ethers.getContractFactory("NoRevertToken");
    const FeeOnTransferToken = await ethers.getContractFactory("FeeOnTransferToken");
    const initSupply = 1000000; // 1M
    const noRevertToken = await NoRevertToken.connect(deployer).deploy(initSupply);
    const feeOnTransferToken = await FeeOnTransferToken.connect(deployer).deploy(initSupply, beneficiary.address);

    expect(await noRevertToken.balanceOf(deployer.address)).to.be.equal(initSupply);
    expect(await feeOnTransferToken.balanceOf(deployer.address)).to.be.equal(initSupply);

    /// Airdrop
    await noRevertToken.connect(deployer).transfer(bob.address, 1000);
    await noRevertToken.connect(deployer).transfer(alice.address, 1000);
    await feeOnTransferToken.connect(deployer).transfer(bob.address, 1000);
    await feeOnTransferToken.connect(deployer).transfer(alice.address, 1000);

    return { tokenBank, noRevertToken, feeOnTransferToken, deployer, bob, alice, attacker };
  }

  describe("Deployment", () => {
    it("Deploy TokenErrorHandling contract", async () => {
      const { tokenBank, noRevertToken, feeOnTransferToken, deployer, bob, alice, attacker } = await deploy();
      expect(await noRevertToken.balanceOf(bob.address)).to.be.equal(1000);
      expect(await noRevertToken.balanceOf(alice.address)).to.be.equal(1000);
      expect(await feeOnTransferToken.balanceOf(bob.address)).to.be.equal(900);
      expect(await feeOnTransferToken.balanceOf(alice.address)).to.be.equal(900);
    });
  });

  describe("Test Deposit", () => {
    it("Unsafe token transfering - NoRevertToken", async () => {
      const { tokenBank, noRevertToken, noReturnToken, feeOnTransferToken, deployer, bob, alice, attacker } = await deploy();
      /// Users deposit noRevertToken into the bank
      const amountToDeposit = 100;
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
      const attackerBalanceBefore = await noRevertToken.balanceOf(attacker.address);
      console.log(`Token.balanceOf[attacker]: ${attackerBalanceBefore} NRvT`);
      /// the attack
      const amountToSteal = 100 + 100; /// balance of bob + alice
      await noRevertToken.connect(attacker).approve(tokenBank.address, amountToSteal);
      await tokenBank.connect(attacker).depositUnsafe(noRevertToken.address, amountToSteal);
      console.log(`---- After the attack ----`);
      const attackerBalanceInBank = await tokenBank.balances(noRevertToken.address, attacker.address);
      console.log(`TokenBank.balances[NRvT][attacker]: ${attackerBalanceInBank} NRvT`);
      await tokenBank.connect(attacker).withdraw(noRevertToken.address, amountToSteal);
      const attackerBalanceAfter = await noRevertToken.balanceOf(attacker.address);
      console.log(`(After withdrawal) Token.balanceOf[attacker]: ${attackerBalanceAfter} NRvT`);
      expect(attackerBalanceAfter > attackerBalanceBefore);
    });

    it("Unsafe token transfering - FeeOnTransferToken", async () => {
      const { tokenBank, noRevertToken, feeOnTransferToken, deployer, bob, alice, attacker } = await deploy();
      let bobBalanceInBank, aliceBalanceInBank, bankActualBalance;
      const checkBalance = async () => {
        aliceBalanceInBank = await tokenBank.balances(feeOnTransferToken.address, alice.address);
        bobBalanceInBank = await tokenBank.balances(feeOnTransferToken.address, bob.address);
        bankActualBalance = await feeOnTransferToken.balanceOf(tokenBank.address);
        console.log(`TokenBank.balances[FoTT][Alice]: ${aliceBalanceInBank} FoTT`);
        console.log(`TokenBank.balances[FoTT][Bob]  : ${bobBalanceInBank} FoTT`);
        console.log(`FoTT.balanceOf[TokenBank]      : ${bankActualBalance} FoTT`);
      }
      /// Bob deposits 100 FoTT into the bank
      const amountToDeposit = 100;
      await feeOnTransferToken.connect(bob).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(bob).depositUnsafe(feeOnTransferToken.address, amountToDeposit);
      console.log(`-- Bob has deposited --`);
      bobBalanceInBank = await tokenBank.balances(feeOnTransferToken.address, bob.address);
      bankActualBalance = await feeOnTransferToken.balanceOf(tokenBank.address);
      await checkBalance();
      /// Ailce deposits the same amount as Bob
      await feeOnTransferToken.connect(alice).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(alice).depositUnsafe(feeOnTransferToken.address, amountToDeposit);
      console.log(`-- Alice has deposited --`);
      await checkBalance();
      /// Alice withdraws all of her funds.
      await tokenBank.connect(alice).withdraw(feeOnTransferToken.address, aliceBalanceInBank);
      aliceBalanceInBank = await tokenBank.balances(feeOnTransferToken.address, alice.address);
      bobBalanceInBank = await tokenBank.balances(feeOnTransferToken.address, bob.address);
      bankActualBalance = await feeOnTransferToken.balanceOf(tokenBank.address);
      console.log(`-- Alice has withdrawn --`);
      await checkBalance();
      /// If Bob tries to withdraws all of his funds, TX will be reverted
      await expect(tokenBank.connect(bob).withdraw(feeOnTransferToken.address, bobBalanceInBank)).to.be.revertedWith("transferFrom failed");
    });

    it("Safe way to transfer token", async () => {
      const { tokenBank, noRevertToken, feeOnTransferToken, deployer, bob, alice, attacker } = await deploy();
      let aliceNrvtBalanceInBank, aliceFottBalanceInBank, bobNrvtBalanceInBank, bobFottBalanceInBank, bankNrvtActualBalance, bankFottActualBalance;
      const amountToDeposit = 100;
      /// Users deposit noRevertToken into the bank
      await noRevertToken.connect(bob).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(bob).depositSafe(noRevertToken.address, amountToDeposit);
      await noRevertToken.connect(alice).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(alice).depositSafe(noRevertToken.address, amountToDeposit);
      /// Users deposit feeOnTransferToken into the bank
      await feeOnTransferToken.connect(bob).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(bob).depositSafe(feeOnTransferToken.address, amountToDeposit);
      await feeOnTransferToken.connect(alice).approve(tokenBank.address, amountToDeposit);
      await tokenBank.connect(alice).depositSafe(feeOnTransferToken.address, amountToDeposit);
      console.log(`-- Result after deposit --`);
      const feePrecentage = await feeOnTransferToken.feePercentage();
      const fee = feePrecentage.mul(amountToDeposit).div(100);
      const amountToDepositAfterFee = amountToDeposit - fee;
      aliceNrvtBalanceInBank = await tokenBank.balances(noRevertToken.address, alice.address);
      aliceFottBalanceInBank = await tokenBank.balances(feeOnTransferToken.address, bob.address);
      bobNrvtBalanceInBank = await tokenBank.balances(noRevertToken.address, alice.address);
      bobFottBalanceInBank = await tokenBank.balances(feeOnTransferToken.address, bob.address);
      bankNrvtActualBalance = await noRevertToken.balanceOf(tokenBank.address);
      bankFottActualBalance = await feeOnTransferToken.balanceOf(tokenBank.address);
      console.log(`TokenBank.balances[NRvT][Alice] : ${aliceNrvtBalanceInBank} NRvT`);
      console.log(`TokenBank.balances[NRvT][bob]   : ${bobNrvtBalanceInBank} NRvT`);
      console.log(`NRvT.balanceOf[TokenBank]       : ${bankNrvtActualBalance} NRvT`);
      console.log(`TokenBank.balances[FoTT][Alice] : ${aliceFottBalanceInBank} FoTT`);
      console.log(`TokenBank.balances[FoTT][Bob]   : ${bobFottBalanceInBank} FoTT`);
      console.log(`FoTT.balanceOf[TokenBank]       : ${bankFottActualBalance} FoTT`);
      expect(aliceNrvtBalanceInBank).to.equal(amountToDeposit);
      expect(bobNrvtBalanceInBank).to.equal(amountToDeposit);
      expect(bankNrvtActualBalance).to.equal(amountToDeposit * 2);
      expect(aliceFottBalanceInBank).to.equal(amountToDepositAfterFee);
      expect(bobFottBalanceInBank).to.equal(amountToDepositAfterFee);
      expect(bankFottActualBalance).to.equal(amountToDepositAfterFee * 2);
    });
  });

});