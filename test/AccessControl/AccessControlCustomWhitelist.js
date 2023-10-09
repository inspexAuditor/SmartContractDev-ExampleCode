const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControlCustomWhitelist", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin, user1, user2, user3] = await ethers.getSigners();

    /// Deploy testing contracts
    const AccessControlCustomWhitelistAccesssControl = await ethers.getContractFactory("AccessControlCustomWhitelist");
    const funds = ethers.utils.parseEther("10");
    const customWhitelistContract = await AccessControlCustomWhitelistAccesssControl.connect(deployer).deploy(admin.address, {value:funds});

    return { customWhitelistContract, admin, user1, user2, user3 };
  }

  describe("Deployment", () => {
    it("Deploy AccessControlCustomWhitelist contract", async () => {
      const { customWhitelistContract, admin, user1, user2, user3 } = await deploy();
      expect(await customWhitelistContract.admin()).to.be.equal(admin.address);
    });
  });

  describe("Custom Whitelisting", () => {
    it("Add to whitelist", async () => {
      const { customWhitelistContract, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address, user2.address, user3.address];
      await customWhitelistContract.connect(admin).addWhitelist(users);
      expect(await customWhitelistContract.whitelist(user1.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user2.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user3.address)).to.be.true;
    });

    it("Remove from whitelist", async () => {
      const { customWhitelistContract, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address, user2.address, user3.address];
      await customWhitelistContract.connect(admin).addWhitelist(users);
      expect(await customWhitelistContract.whitelist(user1.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user2.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user3.address)).to.be.true;

      const removeUsers = [user3.address];
      await customWhitelistContract.connect(admin).removeWhitelist(removeUsers);
      expect(await customWhitelistContract.whitelist(user3.address)).to.be.false;
    });

    it("Whitelisted user requesting for ETH", async () => {
      const { customWhitelistContract, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address];
      await customWhitelistContract.connect(admin).addWhitelist(users);
      expect(await customWhitelistContract.whitelist(user1.address)).to.be.true;

      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
      await customWhitelistContract.connect(user1).requestForETH();
      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
      console.log(`(before) user1.balance: ${ethers.utils.formatEther(user1BalanceBefore)}`);
      console.log(`(after)  user1.balance: ${ethers.utils.formatEther(user1BalanceAfter)}`);
      expect(user1BalanceBefore).to.lessThan(user1BalanceAfter);
    });

    it("Non-whitelisted user requesting for ETH", async () => {
      const { customWhitelistContract, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address, user2.address];
      await customWhitelistContract.connect(admin).addWhitelist(users);
      expect(await customWhitelistContract.whitelist(user1.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user2.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user3.address)).to.be.false;

      await expect(customWhitelistContract.connect(user3).requestForETH()).to.be.revertedWith("Caller is not in the whitelist");
    });

    it("Whitelisted user requesting during cooldown", async () => {
      const { customWhitelistContract, admin, user1, user2, user3 } = await deploy();
      ///Admin whitelisting users
      const users = [user1.address, user2.address, user3.address];
      await customWhitelistContract.connect(admin).addWhitelist(users);
      expect(await customWhitelistContract.whitelist(user1.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user2.address)).to.be.true;
      expect(await customWhitelistContract.whitelist(user3.address)).to.be.true;

      await customWhitelistContract.connect(user1).requestForETH();
      ///Request again during cooldown
      await expect(customWhitelistContract.connect(user1).requestForETH()).to.be.revertedWith("Please wait for the delay");
    });

  });

});