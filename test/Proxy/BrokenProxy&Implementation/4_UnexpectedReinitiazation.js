const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("UnexpectedReinitiazation", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const Implementation = await ethers.getContractFactory("LogicInConstructorSolution");
    const ImplementationWithIntializer = await ethers.getContractFactory("ImplementationWithIntializer");
    const ProxyWithReinitializableProblem = await ethers.getContractFactory("StorageCollisionProxySolution");
    const ProxyWithSimpleInitializable = await ethers.getContractFactory("ProxyWithSimpleInitializable");

    const implementation = await Implementation.connect(deployer).deploy();
    const number = 10;//can be whatever
    const implementationWithIntializer = await ImplementationWithIntializer.connect(deployer).deploy(number);
    const proxyWithReinitializableProblem = await ProxyWithReinitializableProblem.connect(deployer).deploy(implementation.address);
    const proxyWithSimpleInitializable = await ProxyWithSimpleInitializable.connect(deployer).deploy(implementationWithIntializer.address);
    
    /// Initializer in implementation contract should be disabled
    await expect(implementationWithIntializer.connect(attacker).initialize(10)).to.revertedWith("This contract is already initialized");

    return { proxyWithReinitializableProblem, proxyWithSimpleInitializable, deployer, admin, attacker };
  }

  describe("Test unexpected reinitiazation", () => {
    it("Problem: After the contract has been initialized once, it cam be intialize again.", async () => {
      const { proxyWithReinitializableProblem, proxyWithSimpleInitializable, deployer, admin, attacker } = await deploy();
      const LogicInConstructorSolution = await ethers.getContractFactory("LogicInConstructorSolution");
      const proxyWithReinitializableProblem_as_implementation = LogicInConstructorSolution.attach(proxyWithReinitializableProblem.address);
      // Admin execute the initialize() function after upgrade to a implementation contract
      const version = 1;
      await proxyWithReinitializableProblem_as_implementation.connect(admin).initialize(version);
      // Get version's value from proxy's storage
      console.log(`-- Before the attack --`);
      let versionInStorage = await proxyWithReinitializableProblem_as_implementation.getVersion();
      console.log(`version: ${versionInStorage}`);
      // the attacker execute the initialize() function again
      const attackerVersion = 1337;
      await proxyWithReinitializableProblem_as_implementation.connect(attacker).initialize(attackerVersion);
      console.log(`-- After the attack --`);
      versionInStorage = await proxyWithReinitializableProblem_as_implementation.getVersion();
      console.log(`version: ${versionInStorage}`);
    });

    it("Solution: Implement the restriction logic to allow the contract to be initialized only once (or as expected).", async () => {
      const { proxyWithReinitializableProblem, proxyWithSimpleInitializable, deployer, admin, attacker } = await deploy();
      const ImplementationWithIntializer = await ethers.getContractFactory("ImplementationWithIntializer");
      const proxyWithSimpleInitializable_as_ImplementationWithIntializer = ImplementationWithIntializer.attach(proxyWithSimpleInitializable.address);
      // Admin execute the initialize() function after upgrade to a implementation contract
      const version = 1;
      await proxyWithSimpleInitializable_as_ImplementationWithIntializer.connect(admin).initialize(version);
      // Verify the result
      let immutableVariable = await proxyWithSimpleInitializable_as_ImplementationWithIntializer.immutableVariable();
      console.log(`immutableNumber: ${immutableVariable}`);
      let versionInStorage = await proxyWithSimpleInitializable_as_ImplementationWithIntializer.getVersion();
      console.log(`version: ${versionInStorage}`);
      // If the attack trying to execute the initialize() function, it will be failed.
      const attackerVersion = 1337;
      await expect(
        proxyWithSimpleInitializable_as_ImplementationWithIntializer.connect(attacker).initialize(attackerVersion)
      ).to.be.revertedWith("This contract is already initialized");
    });
  });

});