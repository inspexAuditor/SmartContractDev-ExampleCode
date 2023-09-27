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

  describe("Attack Scenario", () => {
    it("Owner changes the price provider address to steal ETH from contract", async () => {
      const { centralized, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice } = await deploy();
      /// Read current PriceProvider from centralized contract
      let currentPriceProvider = await ethers.getContractAt("TrustedPriceProvider", await centralized.priceProvider());
      /// Users buy tokens
      let buyAmount = 100;
      let currentPrice = await currentPriceProvider.getPrice();
      let payAmount = currentPrice.mul(buyAmount)
      await centralized.connect(bob).buy(bob.address, buyAmount, {value: payAmount});
      await centralized.connect(alice).buy(alice.address, buyAmount, {value: payAmount});
      /// Check users balance
      expect(await centralized.balanceOf(bob.address)).to.equal(buyAmount);
      expect(await centralized.balanceOf(alice.address)).to.equal(buyAmount);
      /// Owner update price
      await centralized.connect(deployer).setPriceProvider(maliciousPriceProvider.address);
      expect(await centralized.priceProvider()).to.equal(maliciousPriceProvider.address);
      /// Owner withdraw ETH from contract 
      const withdrawTx = await centralized.connect(deployer).withdrawNative(deployer.address);
      /* 
        The return values cannot be received directly, unlike a static call. 
        So, we have to extract it from the emitted event.
      */
      const withdrawTxData = await withdrawTx.wait();
      const withdrawEvent = withdrawTxData.events.find(event => event.event == "WithdrawNative");
      const [receiver, receivedAmount] = withdrawEvent.args;
      console.log(`receivedAmount: ${ethers.utils.formatEther(receivedAmount)} ether`);
      expect(receiver).to.equal(deployer.address);
      expect(receivedAmount).to.equal(payAmount.mul(2))
    });
  });

});