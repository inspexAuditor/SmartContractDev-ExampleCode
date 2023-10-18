const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("InitializationFrontRunning", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const ImplementationWithIntializer = await ethers.getContractFactory("ImplementationWithIntializer");
    const ProxyWithSimpleInitializable = await ethers.getContractFactory("ProxyWithSimpleInitializable");
    
    const implementation = await ImplementationWithIntializer.connect(deployer).deploy(10);
    const proxyWithoutUpgradeToAndCall = await ProxyWithSimpleInitializable.connect(deployer).deploy(implementation.address);
    
    return { proxyWithoutUpgradeToAndCall, implementation, deployer, admin, attacker };
  }

  async function frontrun(contract, attacker, version) {
    await contract.connect(attacker).initialize(version);
  }

  describe("Test initialization front-running", () => {
    it("Problem: Attacker can front-run the tx that execute the initialize() function.", async () => {
      const {  proxyWithoutUpgradeToAndCall, implementation, deployer, admin, attacker } = await deploy();
      const LogicInConstructorSolution = await ethers.getContractFactory("LogicInConstructorSolution");
      const proxyWithReinitializableProblem_as_implementation = LogicInConstructorSolution.attach(proxyWithoutUpgradeToAndCall.address);
      // Admin execute the initialize() function after upgrade to a implementation contract
      const version = 1;
      const attackerVersion = 1337;
      // Attacker front runs admin's tx
      await frontrun(proxyWithReinitializableProblem_as_implementation, attacker, attackerVersion);
      // Then admin's tx will be reverted
      await expect(proxyWithReinitializableProblem_as_implementation.connect(admin).initialize(version)).to.be.rejectedWith("This contract is already initialized");
      // Verify the result
      console.log(`version: ${await proxyWithReinitializableProblem_as_implementation.getVersion()}`);
    });

    it("Solution: Upgrade and initiialze in the same TX.", async () => {
      const { proxyWithoutUpgradeToAndCall, implementation, deployer, admin, attacker} = await deploy();
      const ProxyWithUpgradeToAndCall = await ethers.getContractFactory("ProxyWithUpgradeToAndCall");
      // Build calldata for the all after upgrade
      const version = 3;
      const data = implementation.interface.encodeFunctionData("initialize(uint256)", [version]);
      // Upgarde and call initialize() in a TX
      const proxyWithUpgradeToAndCall = await ProxyWithUpgradeToAndCall.connect(deployer).deploy(implementation.address, data);
      // Verify the result
      const LogicInConstructorSolution = await ethers.getContractFactory("LogicInConstructorSolution");
      const proxyWithUpgradeToAndCall_as_implementation = LogicInConstructorSolution.attach(proxyWithUpgradeToAndCall.address);
      console.log(`version: ${await proxyWithUpgradeToAndCall_as_implementation.getVersion()}`);
      const implementationSlot = await ethers.provider.getStorageAt(
        proxyWithUpgradeToAndCall.address, 
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" /// Implementation slot
      );
      console.log(`implementation.address : ${implementation.address}`);
      console.log(`implementationSlot     : ${implementationSlot}`);
    });
  });

});