const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("UnsafeOperations", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin] = await ethers.getSigners();

    /// Deploy testing contracts
    const ProxyWithLibrary = await ethers.getContractFactory("ProxyWithLibrary");
    const ImplementationWithLibrary = await ethers.getContractFactory("ImplementationWithLibrary");

    return { ProxyWithLibrary, ImplementationWithLibrary, deployer, admin };
  }

  describe("Test implementation and proxy with library", () => {
    it("Deploy implementation a nd proxy contract", async () => {
      const { ProxyWithLibrary, ImplementationWithLibrary, deployer, admin } = await deploy();
      /// deploy implementation contract
      const implementationWithLib = await ImplementationWithLibrary.connect(deployer).deploy(100);
      /// deploy and initialize proxy contract
      let data = ImplementationWithLibrary.interface.encodeFunctionData("initialize(uint256,address)", [1, admin.address]);
      const proxyWithLib = await ProxyWithLibrary.connect(deployer).deploy(implementationWithLib.address,data);
      /// Verify result
      const proxyAsImplWithLib = await ImplementationWithLibrary.attach(proxyWithLib.address);
      console.log(`immutableVariable : ${await proxyAsImplWithLib.immutableVariable()}`);
      console.log(`version           : ${await proxyAsImplWithLib.getVersion()}`);
      console.log(`admin             : ${await proxyAsImplWithLib.getAdmin()}`);
      console.log(`admin.address     : ${admin.address}`);
    });
  });

});