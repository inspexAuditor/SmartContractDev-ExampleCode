const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CentralizedContract EOA", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, bob, alice] = await ethers.getSigners();

    /// Deploy testing contracts
    const TrustedPriceProviderContract = await ethers.getContractFactory("TrustedPriceProvider");
    const MaliciousPriceProviderContract = await ethers.getContractFactory("MaliciousPriceProvider");
    const CentralizedContractt = await ethers.getContractFactory("CentralizedContract");
    const trustedPriceProvider = await TrustedPriceProviderContract.connect(deployer).deploy();
    const maliciousPriceProvider = await MaliciousPriceProviderContract.connect(deployer).deploy();
    const centralized = await CentralizedContractt.connect(deployer).deploy(trustedPriceProvider.address);

    return { centralized, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice };
  }

  describe("Deployment", () => {
    it("Deploy AccessControlExample contract", async () => {
      const { centralized, trustedPriceProvider, maliciousPriceProvider, deployer } = await deploy();
      expect(await centralized.owner()).to.equal(deployer.address);
      expect(await centralized.priceProvider()).to.equal(trustedPriceProvider.address);
    });
  });

  describe("Attack Scenarios", () => {

    it("Scenario 1: The owner can suddenly change the price provider's address, and it's affecting users right away", async () => {
      const { centralized, trustedPriceProvider, maliciousPriceProvider, deployer, bob } = await deploy();
      /// Read current PriceProvider from centralized contract
      let currentPriceProvider = await ethers.getContractAt("TrustedPriceProvider", await centralized.priceProvider());
      /// Users buy the token
      let buyAmount = 1000;
      let currentPrice = await currentPriceProvider.getPrice();
      let payAmount = currentPrice.mul(buyAmount)
      console.log(`-- Before the price provider has been changed --`);
      console.log(`Bob paid ${ethers.utils.formatEther(payAmount)} ETH to get ${buyAmount} CTK`);
      await centralized.connect(bob).buy(bob.address, buyAmount, {value: payAmount});
      /// Check Bob's balance
      expect(await centralized.balanceOf(bob.address)).to.equal(buyAmount);
      /// Owner update price provider
      await centralized.connect(deployer).setPriceProvider(maliciousPriceProvider.address);
      expect(await centralized.priceProvider()).to.equal(maliciousPriceProvider.address);
      /// Bob sells the token after the price has been changed
      const sellTx = await centralized.connect(bob).sell(bob.address, buyAmount);
      const sellTxData = await sellTx.wait();
      const sellTxEvent = sellTxData.events.find(event => event.event == "Sell");
      const [receiverAddress, sellAmount, receiveAmount] = sellTxEvent.args;
      console.log(`-- After the price provider has been changed --`);
      console.log(`Bob sold ${buyAmount} CTK to receive ${ethers.utils.formatEther(receiveAmount)} ETH`);
    });

    it("Scenario 2: The owner changes the price provider's address to steal ETH from the contract", async () => {
      const { centralized, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice } = await deploy();
      /// Read current PriceProvider from centralized contract
      let currentPriceProvider = await ethers.getContractAt("TrustedPriceProvider", await centralized.priceProvider());
      /// Users buy the token
      let buyAmount = 1000;
      let currentPrice = await currentPriceProvider.getPrice();
      let payAmount = currentPrice.mul(buyAmount)
      await centralized.connect(bob).buy(bob.address, buyAmount, {value: payAmount});
      await centralized.connect(alice).buy(alice.address, buyAmount, {value: payAmount});
      console.log(`-- Before the price provider has been changed --`);
      console.log(`Users' total payAmount: ${ethers.utils.formatEther(payAmount.mul(2))} ETH`);
      /// Check users balance
      expect(await centralized.balanceOf(bob.address)).to.equal(buyAmount);
      expect(await centralized.balanceOf(alice.address)).to.equal(buyAmount);
      /// Owner update price
      await centralized.connect(deployer).setPriceProvider(maliciousPriceProvider.address);
      expect(await centralized.priceProvider()).to.equal(maliciousPriceProvider.address);
      console.log(`-- After the price provider has been changed --`);
      /// Owner withdraw ETH from contract 
      const withdrawTx = await centralized.connect(deployer).withdrawNative(deployer.address);
      /* 
        The return values cannot be received directly, unlike a static call. 
        So, we have to extract it from the emitted event.
      */
      const withdrawTxData = await withdrawTx.wait();
      const withdrawEvent = withdrawTxData.events.find(event => event.event == "WithdrawNative");
      const [receiver, receivedAmount] = withdrawEvent.args;
      console.log(`Owner rugpull by executing the withdraw(), and receive ${ethers.utils.formatEther(receivedAmount)} ETH`);
    });
  });

});