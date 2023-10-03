const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleErrorHandling", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const SimpleErrorHandlingContract = await ethers.getContractFactory("SimpleErrorHandlingContract");
    const simpleEH = await SimpleErrorHandlingContract.connect(deployer).deploy();

    const newValue = 100;
    await simpleEH.connect(deployer).setValue(newValue);

    return { simpleEH, deployer };
  }

  describe("Deployment", () => {
    it("Deploy SimpleErrorHandling contract", async () => {
      const { simpleEH, deployer } = await deploy();
      expect(await simpleEH.value()).to.be.equal(100);
    });
  });

  describe("Test Error Handling", () => {
    it("Revert - Case 1: invalid value", async () => {
      const { simpleEH, deployer  } = await deploy();  
      await expect(simpleEH.connect(deployer).setValue(10)).to.be.rejectedWith("Value cannot be 10");
    });

    it("Revert - Case 2: valid value", async () => {
      const { simpleEH, deployer  } = await deploy();  
      const newValue = 5;
      await simpleEH.connect(deployer).setValue(newValue);
      expect(await simpleEH.value()).to.be.equal(newValue);
    });

    it("Require - Case 1: amount > value", async () => {
      const { simpleEH, deployer } = await deploy();
      await expect(simpleEH.connect(deployer).decrementValue(101)).to.be.reverted;
    });

    it("Require - Case 2: amount <= value", async () => {
      const { simpleEH, deployer } = await deploy();
      await simpleEH.connect(deployer).decrementValue(99); /// 100 - 99 = 1
      await simpleEH.connect(deployer).decrementValue(1);  /// 1 - 1 = 0
    });

    it("Assert - Case 1: amount == 0", async () => {
      const { simpleEH, deployer } = await deploy();
      await expect(simpleEH.connect(deployer).incrementValue(0)).to.be.rejected;
    });

    it("Assert - Case 1: amount > 0", async () => {
      const { simpleEH, deployer } = await deploy();
      const amount = 1337;
      const currentValue = await simpleEH.value();
      const expectedNewValue = currentValue.add(amount);
      expect(await simpleEH.connect(deployer).incrementValue(amount) == expectedNewValue);
    });

  });

});