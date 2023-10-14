const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BeaconProxyPattern", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const BeaconContract = await ethers.getContractFactory("BeaconContract");
    const BeaconProxyContract = await ethers.getContractFactory("BeaconProxyContract");
    const BeaconImplementationV1Contract = await ethers.getContractFactory("BeaconImplementationV1");
    const BeaconImplementationV2Contract = await ethers.getContractFactory("BeaconImplementationV2");
    
    const implV1 = await BeaconImplementationV1Contract.connect(deployer).deploy();
    const implV2 = await BeaconImplementationV2Contract.connect(deployer).deploy();
    const beacon = await BeaconContract.connect(deployer).deploy(implV1.address);
    const proxyA = await BeaconProxyContract.connect(deployer).deploy(beacon.address);
    const proxyB = await BeaconProxyContract.connect(deployer).deploy(beacon.address);

    return { implV1, implV2, beacon, proxyA, proxyB, deployer };
  }

  describe("Deployment", () => {
    it("Deploy Beacon contracts", async () => {
      const { implV1, implV2, beacon, proxyA, proxyB, deployer } = await deploy();
      expect(await beacon.owner()).to.be.equal(deployer.address);
      expect(await beacon.implementation()).to.be.equal(implV1.address);
      expect(await proxyA.getBeacon()).to.be.equal(beacon.address);
      expect(await proxyB.getBeacon()).to.be.equal(beacon.address);
    });
  });

  describe("Test beacon proxy pattern", () => {
    it("Upgrade implementation", async () => {
      const { implV1, implV2, beacon, proxyA, proxyB, deployer } = await deploy();

      /// Attach proxy's address to implementation contract object, so you can simply call functions that do not exist in proxy code 
      const implContract = await ethers.getContractFactory("BeaconImplementationV1");
      const proxyA_as_impl = implContract.attach(proxyA.address);
      const proxyB_as_impl = implContract.attach(proxyB.address);

      console.log(`=== Before the upgrade ===`);
      console.log(`proxyA.getVersion() : ${await proxyA_as_impl.getVersion()}`);
      console.log(`proxyB.getVersion() : ${await proxyB_as_impl.getVersion()}`);

      /// Upgrade to V2
      await beacon.connect(deployer).upgradeImplementation(implV2.address);

      console.log(`=== After the upgrade ===`);
      console.log(`proxyA.getVersion() : ${await proxyA_as_impl.getVersion()}`);
      console.log(`proxyB.getVersion() : ${await proxyB_as_impl.getVersion()}`);
    });

  });

});