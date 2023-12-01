const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControlCustomWhitelist", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin, user1, user2, user3] = await ethers.getSigners();

    /// Deploy testing contracts
    const AccessControlCustomWhitelistAccesssControl = await ethers.getContractFactory("AccessControlCustomWhitelist");
    const privateBank = await AccessControlCustomWhitelistAccesssControl.connect(deployer).deploy(admin.address);

    return { privateBank, admin, user1, user2, user3 };
  }

  describe("Deployment", () => {
    it("Deploy AccessControlCustomWhitelist contract", async () => {
      const { privateBank, admin, user1, user2, user3 } = await deploy();
      expect(await privateBank.admin()).to.be.equal(admin.address);
    });
  });

  describe("Custom Whitelisting", () => {
    it("Add to whitelist", async () => {
      const { privateBank, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address, user2.address, user3.address];
      await privateBank.connect(admin).addWhitelist(users);
      expect(await privateBank.whitelist(user1.address)).to.be.true;
      expect(await privateBank.whitelist(user2.address)).to.be.true;
      expect(await privateBank.whitelist(user3.address)).to.be.true;
    });

    it("Remove from whitelist", async () => {
      const { privateBank, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address, user2.address, user3.address];
      await privateBank.connect(admin).addWhitelist(users);
      expect(await privateBank.whitelist(user1.address)).to.be.true;
      expect(await privateBank.whitelist(user2.address)).to.be.true;
      expect(await privateBank.whitelist(user3.address)).to.be.true;

      const removeUsers = [user3.address];
      await privateBank.connect(admin).removeWhitelist(removeUsers);
      expect(await privateBank.whitelist(user3.address)).to.be.false;
    });

    it("Whitelisted user deposit and withdraw", async () => {
      const { privateBank, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address];
      await privateBank.connect(admin).addWhitelist(users);
      expect(await privateBank.whitelist(user1.address)).to.be.true;
      ///User1 deposit 1 ETH to the bank
      const user1BalanceBefore = await privateBank.balanceOf(user1.address);
      const amountToDeposit = ethers.utils.parseEther("1");
      await privateBank.connect(user1).deposit(user1.address, {value: amountToDeposit});
      const user1BalanceAfter = await privateBank.balanceOf(user1.address);
      ///Verify balance after deposit
      console.log(`(before) user1.balance: ${ethers.utils.formatEther(user1BalanceBefore)} ETH`);
      console.log(`(after)  user1.balance: ${ethers.utils.formatEther(user1BalanceAfter)} ETH`);
      expect(user1BalanceAfter).to.equal(amountToDeposit.add(user1BalanceBefore));
    });

    it("Non-whitelisted user trying to deposit", async () => {
      const { privateBank, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting user1 and user2
      const users = [user1.address, user2.address];
      await privateBank.connect(admin).addWhitelist(users);
      expect(await privateBank.whitelist(user1.address)).to.be.true;
      expect(await privateBank.whitelist(user2.address)).to.be.true;
      expect(await privateBank.whitelist(user3.address)).to.be.false;
      ///User3 trying to deposit 1 ETH to the bank, and it should be reverted
      const amountToDeposit = ethers.utils.parseEther("1");
      await expect(
        privateBank.connect(user3).deposit(user3.address, {value: amountToDeposit})
      ).to.be.revertedWith("Caller is not in the whitelist");
    });

  });

});