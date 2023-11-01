const { expect } = require("chai");
const { arrayify } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("UnexpectedReinitiazation", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer, admin, attacker] = await ethers.getSigners();

    /// Deploy testing contracts
    const ImplementationWithReinitializableProblem = await ethers.getContractFactory("LogicInConstructorSolution");
    const ImplementationWithIntializer = await ethers.getContractFactory("ImplementationWithIntializer");
    const ProxyFactory = await ethers.getContractFactory("SimpleProxyWithoutCollision");

    const implementationWithReinitializableProblem = await ImplementationWithReinitializableProblem.connect(deployer).deploy();
    const implementationWithIntializer = await ImplementationWithIntializer.connect(deployer).deploy();

    return { ProxyFactory, implementationWithReinitializableProblem, implementationWithIntializer, deployer, admin, attacker };
  }

  describe("Test unexpected reinitiazation", () => {
    it("Problem: After the contract has been initialized once, it cam be intialize again.", async () => {
      const { ProxyFactory, implementationWithReinitializableProblem, implementationWithIntializer, deployer, admin, attacker } = await deploy();
      // Deploy proxy
      const proxy = await ProxyFactory.connect(deployer).deploy(implementationWithReinitializableProblem.address);
      const LogicInConstructorSolution = await ethers.getContractFactory("LogicInConstructorSolution");
      const proxy_as_implementationWithReinitializableProblem = LogicInConstructorSolution.attach(proxy.address);
      // Admin execute the initialize() function after upgrade to a implementation contract
      const version = 1;
      await proxy_as_implementationWithReinitializableProblem.connect(admin).initialize(version);
      // Get version's value from proxy's storage
      console.log(`-- Before the attack --`);
      let versionInStorage = await proxy_as_implementationWithReinitializableProblem.getVersion();
      console.log(`version: ${versionInStorage}`);
      // the attacker execute the initialize() function again
      const attackerVersion = 1337;
      await proxy_as_implementationWithReinitializableProblem.connect(attacker).initialize(attackerVersion);
      console.log(`-- After the attack --`);
      versionInStorage = await proxy_as_implementationWithReinitializableProblem.getVersion();
      console.log(`version: ${versionInStorage}`);
    });

    it("Solution: Implement the restriction logic to allow the contract to be initialized only once (or as expected).", async () => {
      const { ProxyFactory, implementationWithReinitializableProblem, implementationWithIntializer, deployer, admin, attacker } = await deploy();
      // Deploy proxy
      const proxy = await ProxyFactory.connect(deployer).deploy(implementationWithIntializer.address);
      const ImplementationWithIntializer = await ethers.getContractFactory("ImplementationWithIntializer");
      const proxy_as_ImplementationWithIntializer = ImplementationWithIntializer.attach(proxy.address);
      // Admin execute the initialize() function after upgrade to a implementation contract
      const version = 1;
      await proxy_as_ImplementationWithIntializer.connect(admin).initialize(version);
      // Verify the result
      let versionInStorage = await proxy_as_ImplementationWithIntializer.getVersion();
      console.log(`version: ${versionInStorage}`);
      // If the attack trying to execute the initialize() function, it will be reverted.
      const attackerVersion = 1337;
      await expect(
        proxy_as_ImplementationWithIntializer.connect(attacker).initialize(attackerVersion)
      ).to.be.revertedWith("This contract is already initialized");
    });
  });

});