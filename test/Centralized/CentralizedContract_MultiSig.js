const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CentralizedContract Timelock", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, bob, alice, peter, user_one, user_two] = await ethers.getSigners();

    /// Deploy testing contracts
    const TrustedPriceProviderContract = await ethers.getContractFactory("TrustedPriceProvider");
    const MaliciousPriceProviderContract = await ethers.getContractFactory("MaliciousPriceProvider");
    const CentralizedContractt = await ethers.getContractFactory("CentralizedContract");
    const MultiSigWalletContract = await ethers.getContractFactory("MultiSigWallet");
    const trustedPriceProvider = await TrustedPriceProviderContract.connect(deployer).deploy();
    const maliciousPriceProvider = await MaliciousPriceProviderContract.connect(deployer).deploy();
    const centralized = await CentralizedContractt.connect(deployer).deploy(trustedPriceProvider.address);
    
    const walletOwners = [bob.address, alice.address, peter.address];
    const confirmationsRequired = 3;
    /// Deploy MultiSigWallet
    const multiSigWallet = await MultiSigWalletContract.connect(bob).deploy(walletOwners, confirmationsRequired);
    /// Transfer ownership to a MultiSigWallet contract
    centralized.connect(deployer).transferOwnership(multiSigWallet.address);

    return { centralized, multiSigWallet, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice, peter, user_one, user_two };
  }

  describe("Deployment", () => {
    it("Deploy AccessControlExample contract", async () => {
      const { centralized, multiSigWallet, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice, peter } = await deploy();
      /* 
        Chain of Ownership:
          MultiSigWalletContract -> CentralizedContract
      */
      expect(await multiSigWallet.isOwner(bob.address)).to.be.true;
      expect(await multiSigWallet.isOwner(alice.address)).to.be.true;
      expect(await multiSigWallet.isOwner(peter.address)).to.be.true;
      expect(await multiSigWallet.numConfirmationsRequired()).to.equal(3);
      expect(await centralized.owner()).to.equal(multiSigWallet.address);
      expect(await centralized.priceProvider()).to.equal(trustedPriceProvider.address);
    });
  });

  describe("Attack Scenario", () => {
    it("Owner changes the price provider address to steal ETH from contract", async () => {
      const { centralized, multiSigWallet, trustedPriceProvider, maliciousPriceProvider, deployer, bob, alice, peter, user_one, user_two } = await deploy();
      /// Read current PriceProvider from the centralized contract
      let currentPriceProvider = await ethers.getContractAt("TrustedPriceProvider", await centralized.priceProvider());
      /// Users buy tokens
      let buyAmount = 100;
      let currentPrice = await currentPriceProvider.getPrice();
      let payAmount = currentPrice.mul(buyAmount)
      await centralized.connect(user_one).buy(user_one.address, buyAmount, {value: payAmount});
      await centralized.connect(user_two).buy(user_two.address, buyAmount, {value: payAmount});
      /// Check users balance
      expect(await centralized.balanceOf(user_one.address)).to.equal(buyAmount);
      expect(await centralized.balanceOf(user_two.address)).to.equal(buyAmount);
      
      /*
        In this situation,
        The owners are still able to update the price provider's address and then withdraw native tokens.
      */
      /// Bob submit the setPriceProvider() transaction
      const to = centralized.address;
      const value = 0;
      let data = centralized.interface.encodeFunctionData("setPriceProvider", [maliciousPriceProvider.address]);
      let submitTransactionTx = await multiSigWallet.connect(bob).submitTransaction(to, value, data);
      let submitTransactionTxData =  await submitTransactionTx.wait();
      let submitTransactionEvent = submitTransactionTxData.events.find(event => event.event == "SubmitTransaction");
      const setPriceProviderTxIndex = submitTransactionEvent.args[1];
      console.log(`setPriceProviderTxIndex: ${setPriceProviderTxIndex}`);
      /// Bob confirm the setPriceProvider() transaction
      await multiSigWallet.connect(bob).confirmTransaction(setPriceProviderTxIndex);
      /// Alice confirm the setPriceProvider() transaction
      await multiSigWallet.connect(alice).confirmTransaction(setPriceProviderTxIndex);
      /// Peter confirm the setPriceProvider() transaction
      await multiSigWallet.connect(peter).confirmTransaction(setPriceProviderTxIndex);
      /// Bob execute the setPriceProvider() transaction
      await multiSigWallet.connect(bob).executeTransaction(setPriceProviderTxIndex);
      expect(await centralized.priceProvider()).to.equal(maliciousPriceProvider.address);

      /// Bob submit the withdrawNative() transaction
      data = centralized.interface.encodeFunctionData("withdrawNative", [multiSigWallet.address]);
      submitTransactionTx = await multiSigWallet.connect(bob).submitTransaction(to, value, data);
      submitTransactionTxData =  await submitTransactionTx.wait();
      submitTransactionEvent = submitTransactionTxData.events.find(event => event.event == "SubmitTransaction");
      const withdrawNativeTxIndex = submitTransactionEvent.args[1];
      console.log(`withdrawNativeTxIndex: ${withdrawNativeTxIndex}`);
      /// Bob confirm the withdrawNative() transaction
      await multiSigWallet.connect(bob).confirmTransaction(withdrawNativeTxIndex);
      /// Alice confirm the withdrawNative() transaction
      await multiSigWallet.connect(alice).confirmTransaction(withdrawNativeTxIndex);
      /// Peter confirm the withdrawNative() transaction
      await multiSigWallet.connect(peter).confirmTransaction(withdrawNativeTxIndex);
      /// Bob execute the withdrawNative() transaction
      await multiSigWallet.connect(bob).executeTransaction(withdrawNativeTxIndex);
      expect(await ethers.provider.getBalance(multiSigWallet.address)).to.be.equal(payAmount.mul(2));
    });
  });

});