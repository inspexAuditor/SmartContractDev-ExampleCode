const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CentralizedContract Timelock", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, bob, alice] = await ethers.getSigners();

    /// Deploy testing contracts
    const TrustedPriceProviderContract = await ethers.getContractFactory("TrustedPriceProvider");
    const MaliciousPriceProviderContract = await ethers.getContractFactory("MaliciousPriceProvider");
    const CentralizedContractt = await ethers.getContractFactory("CentralizedContract");
    const TimelockContractt = await ethers.getContractFactory("TimelockContract");
    const trustedPriceProvider = await TrustedPriceProviderContract.connect(deployer).deploy();
    const maliciousPriceProvider = await MaliciousPriceProviderContract.connect(deployer).deploy();
    const centralized = await CentralizedContractt.connect(deployer).deploy(trustedPriceProvider.address);
    const delay = 60 * 60 * 24 * 7 ;  /// delay 7 days
    
    /// Deploy Timelock
    const timelock = await TimelockContractt.connect(deployer).deploy(deployer.address, delay);
    /// Transfer ownership to a timelock contract
    centralized.connect(deployer).transferOwnership(timelock.address);

    return { centralized, timelock, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice };
  }

  describe("Deployment", () => {
    it("Deploy AccessControlExample contract", async () => {
      const { centralized, timelock, trustedPriceProvider, maliciousPriceProvider, deployer } = await deploy();
      /* 
        Deployer -> Timelock -> CentralizedContract
      */
      expect(await timelock.admin()).to.equal(deployer.address);
      expect(await centralized.owner()).to.equal(timelock.address);
      expect(await centralized.priceProvider()).to.equal(trustedPriceProvider.address);
    });
  });

  describe("Attack Scenario", () => {
    it("Owner changes the price provider address to steal ETH from contract", async () => {
      const { centralized, timelock, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice } = await deploy();
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
      /*
        In this situation,
        If the owner wants to update the price provider's address, 
        They must execute it via the timelock contract.
        And it can be effective in the next 7 days.
      */
      const target = centralized.address;
      const value = 0;
      const signature = "";
      const data = centralized.interface.encodeFunctionData("setPriceProvider", [maliciousPriceProvider.address]); // signature is already included in the data
      const delay = 60 * 60 * 24 * 7 ;  /// delay 7 days
      const eta = (await ethers.provider.getBlock('latest')).timestamp + delay + 60; /// add 60 seconds to supporting the execution delay
      /// Queue transaction
      const queueTransactionTx = await timelock.connect(deployer).queueTransaction(target, value, signature, data, eta);
      const queueTransactionTxData = await queueTransactionTx.wait();
      const queueTransactionEvent =  queueTransactionTxData.events.find(event => event.event == "QueueTransaction");
      const txHash = queueTransactionEvent.args[0];
      expect(await timelock.queuedTransactions(txHash)).to.be.true;
      /*
        In the waiting period (~7 days),
        The users can be notified of the critical changes via the protocol team's announcement or by monitoring the timelock contract.
        And they can make a decision to secure assets in the contract. 
      */
      await centralized.connect(bob).sell(bob.address, buyAmount);
      await centralized.connect(alice).sell(bob.address, buyAmount);
      /// Check users balance
      expect(await centralized.balanceOf(bob.address)).to.equal(0);
      expect(await centralized.balanceOf(alice.address)).to.equal(0);
      /*
        Skipping time for 7 days.
      */
      await ethers.provider.send("evm_increaseTime", [delay + 60 + 100]);
      /*
        After the waiting period,
        The owner execute the transaction.
        And the critical changes is efective now.
      */
      /// Execute transaction
      await timelock.connect(deployer).executeTransaction(target, value, signature, data, eta);
      
    });
  });

});