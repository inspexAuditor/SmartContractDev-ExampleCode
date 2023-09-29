const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UnderflowOverflowV8", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const CounterV8 = await ethers.getContractFactory("CounterV8Contract");
    const CounterV8Unchecked = await ethers.getContractFactory("CounterV8UncheckedContract");
    const conterV8 = await CounterV8.connect(deployer).deploy();
    const counterV8Unchecked = await CounterV8Unchecked.connect(deployer).deploy();

    return { conterV8, counterV8Unchecked, deployer };
  }

  describe("Deployment", () => {
    it("Deploy Counter contract", async () => {
      const { conterV8, counterV8Unchecked, deployer  } = await deploy();
      expect(await conterV8.get()).to.equal(0);
      expect(await counterV8Unchecked.get()).to.equal(0);
    });
  });

  
  describe("Version >= 0.8.0 is safe from underflow and overflow", () => {
    it("Safe from underflow", async () => {
      const { conterV8, counterV8Unchecked, deployer } = await deploy();
      let value = await conterV8.get();
      console.log(`value before decrease: ${value}`);
      /// tx will be reverted due to the underflow
      await expect(conterV8.connect(deployer).decrease()).to.be.reverted;
    });

    it("Safe from overflow", async () => {
      const { conterV8, counterV8Unchecked, deployer } = await deploy();
      /// set counter to max of uint8
      await conterV8.connect(deployer).setMax();
      let value = await conterV8.get();
      console.log(`value before increase: ${value}`);
      /// tx will be reverted due to the overflow
      await expect(conterV8.connect(deployer).increase()).to.be.reverted;
    });
  });

  describe("Underflow and overflow in version < 0.8.0", () => {
    it("Underflow", async () => {
      const { conterV8, counterV8Unchecked, deployer } = await deploy();
      let value = await counterV8Unchecked.get();
      console.log(`value before decrease: ${value}`);
      /// underflow: 0-1 = max
      await counterV8Unchecked.connect(deployer).decrease();
      value = await counterV8Unchecked.get();
      console.log(`value after decrease : ${value}`);
    });

    it("Overflow", async () => {
      const { conterV8, counterV8Unchecked, deployer } = await deploy();
      /// set counter to max of uint8
      await counterV8Unchecked.connect(deployer).setMax();
      let value = await counterV8Unchecked.get();
      console.log(`value before increase: ${value}`);
      /// overflow: max+1 = 0
      await counterV8Unchecked.connect(deployer).increase();
      value = await counterV8Unchecked.get();
      console.log(`value after increase : ${value}`);
    });
  });

});