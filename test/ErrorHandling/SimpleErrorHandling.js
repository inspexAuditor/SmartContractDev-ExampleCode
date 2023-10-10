const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleErrorHandling", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const SimpleErrorHandlingContract = await ethers.getContractFactory("SimpleErrorHandlingContract");
    const simpleEH = await SimpleErrorHandlingContract.connect(deployer).deploy();

    await simpleEH.connect(deployer).setValue(50);

    return { simpleEH, deployer };
  }

  describe("Deployment", () => {
    it("Deploy SimpleErrorHandling contract", async () => {
      const { simpleEH, deployer } = await deploy();
      expect(await simpleEH.value()).to.be.equal(50);
    });
  });

  describe("Test Error Handling", () => {
    it("Revert - Case 1: set the value to less than 10", async () => {
      const { simpleEH, deployer  } = await deploy();  
      await expect(simpleEH.connect(deployer).setValue(9)).to.be.revertedWith("Value must be in range 10-100");
    });

    it("Revert - Case 2: set the value to more than 100", async () => {
      const { simpleEH, deployer  } = await deploy();  
      await expect(simpleEH.connect(deployer).setValue(101)).to.be.revertedWithCustomError(simpleEH, "ValueOutOfRange");
    });

    it("Require - Case 1: the new value is less than 10", async () => {
      const { simpleEH, deployer } = await deploy();
      await expect(simpleEH.connect(deployer).decreseValue(41)).to.be.revertedWith("Value must be in range 10-100");
    });

    it("Assert - Case 1: the new value is more than 100", async () => {
      const { simpleEH, deployer } = await deploy();
      await expect(simpleEH.connect(deployer).increaseValue(51)).to.be.revertedWithPanic("0x01"); // 0x01 is assert's error code
    });
  });

});