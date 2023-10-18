const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("StorageOrderingInNewImplementation", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin] = await ethers.getSigners();

    /// Deploy testing contracts
    const ImplementationWithSelfDestruct = await ethers.getContractFactory("ImplementationWithSelfDestruct");
    const ImplementationWithDelegatecall = await ethers.getContractFactory("ImplementationWithDelegatecall");

    const implementationWithSelfDestruct = await ImplementationWithSelfDestruct.connect(deployer).deploy();
    const implementationWithDelegatecall = await ImplementationWithDelegatecall.connect(deployer).deploy();

    return { implementationWithSelfDestruct, implementationWithDelegatecall, deployer, admin };
  }

  describe("Test unsafe operations", () => {
    it("Problem 1: The implementation's logic contains the selfdestruct() function", async () => {
      const { implementationWithSelfDestruct, implementationWithDelegatecall, deployer, admin } = await deploy();
      const ImplementationWithSelfDestruct = await ethers.getContractFactory("ImplementationWithSelfDestruct");
      /// Deploy proxy contract by define the ImplementationWithSelfDestruct as implementation contract
      const SimpleUpgradableProxy = await ethers.getContractFactory("SimpleUpgradableProxy");
      const proxy = await SimpleUpgradableProxy.connect(deployer).deploy(admin.address, implementationWithSelfDestruct.address, []);
      const proxy_as_ImplementationWithSelfDestruct = ImplementationWithSelfDestruct.attach(proxy.address);
      
      console.log(`-- Before excute self-destruct --`);
      let code = await ethers.provider.getCode(proxy.address);
      console.log(`proxy.code.length: ${code.length}`);
      console.log(`proxy.code: ${code}`);

      /// Admin calls a function that contains self-destruct()
      await proxy_as_ImplementationWithSelfDestruct.connect(admin).destroy(admin.address);

      console.log(`-- After excute self-destruct --`);
      code = await ethers.provider.getCode(proxy.address);
      console.log(`proxy.code.length: ${code.length}`);
      console.log(`proxy.code: ${code}`);
    });

    it("Problem 2: The implementation's logic contains the delegatecall to unstrusted contract", async () => {
      const { implementationWithSelfDestruct, implementationWithDelegatecall, deployer, admin } = await deploy();
      const ImplementationWithDelegatecall = await ethers.getContractFactory("ImplementationWithDelegatecall");
      /// Deploy proxy contract by define the ImplementationWithDelegatecall as implementation contract
      const SimpleUpgradableProxy = await ethers.getContractFactory("SimpleUpgradableProxy");
      const proxy = await SimpleUpgradableProxy.connect(deployer).deploy(admin.address, implementationWithDelegatecall.address, []);
      const proxy_as_ImplementationWithDelegatecall = ImplementationWithDelegatecall.attach(proxy.address);
      
      console.log(`-- Before excute delegatecall --`);
      let code = await ethers.provider.getCode(proxy.address);
      console.log(`proxy.code.length: ${code.length}`);
      console.log(`proxy.code: ${code}`);

      /// Admin calls a function that contains delegatecall() to untrusted contract
      const data = implementationWithSelfDestruct.interface.encodeFunctionData("destroy(address)", [admin.address]);
      await proxy_as_ImplementationWithDelegatecall.connect(admin).callAnotherContract(
        implementationWithSelfDestruct.address,
        data
      );

      console.log(`-- After excute delegatecall --`);
      code = await ethers.provider.getCode(proxy.address);
      console.log(`proxy.code.length: ${code.length}`);
      console.log(`proxy.code: ${code}`);
    });
  });

});