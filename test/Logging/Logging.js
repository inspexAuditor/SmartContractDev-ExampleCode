const { expect } = require("chai");
const { Fragment } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Logging", function () {
  
  async function deploy() {
    /// Get accounts
    let [deployer] = await ethers.getSigners();

    /// Deploy testing contracts
    const LoggingContract = await ethers.getContractFactory("LoggingContract");
    const loggingContract = await LoggingContract.connect(deployer).deploy();

    return { loggingContract, deployer };
  }

  describe("Test Logging", () => {
    it("Read the emitted log", async () => {
      const { loggingContract, deployer } = await deploy();
      const startTime = (await loggingContract.getCurrentTime()).add(10); // currentTime + delay 10 second
      const endTime = startTime + (60 * 60 * 24 * 7); /// startTime + 7 days
      /// Excute the setter function
      const setTx = await loggingContract.connect(deployer).setStartEndTime(startTime, endTime);
      /// wait for the log
      let setTxData = await setTx.wait();
      /// Select a specific event log
      const setEvent = setTxData.events.find(event => event.event === "SetStartEndTime");
      /// Extract the parameters
      const [start, end, period] = setEvent.args;
      console.log(`startTime: ${start}`);
      console.log(`endTime  : ${end}`);
      console.log(`period   : ${period}`);
      /// Verify the values
      expect(start).to.equal(startTime);
      expect(end).to.equal(endTime);
      expect(period).to.equal(endTime - startTime);
    });
  });

});