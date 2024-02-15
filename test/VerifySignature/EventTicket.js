const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = require("ethers/lib/utils");




function splitSignature(sig) {
  console.log(sig.length)
  console.log(sig.slice(130, 132))

  // if (sig.length !== 65) {
  //   throw new Error("Invalid signature length", sig.length);
  // }

  const r = '0x' + sig.slice(2, 66);
  const s = '0x' + sig.slice(66, 130);
  const v = parseInt(sig.slice(130, 132), 16);

  return { r, s, v };
}

function getMalleabilitySignature(sig) {
  let { r, s, v } = ethers.utils.splitSignature(sig);

  if (v == 27) v++;
  else if (v == 28) v--;

  const N = ethers.BigNumber.from("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
  const sBN = ethers.BigNumber.from(s);
  const malsigS = N.sub(sBN).toHexString();

  const malsig = ethers.utils.solidityPack(['bytes32', 'bytes32', 'uint8'], [r, malsigS, v]);
  return malsig;
}


async function deploy() {
  /// Get accounts
  let [deployer, otherAccount] = await ethers.getSigners();

  /// Deploy testing contracts
  const EventTicket = await ethers.getContractFactory("EventTicket");
  const eventTicket = await EventTicket.connect(deployer).deploy();

  return { eventTicket, deployer, otherAccount };
}


describe("Ownable", function () {

  it('should not allow external access to internalFunction', async () => {
    const { eventTicket, otherAccount } = await deploy();
    try {
      await eventTicket._transferOwnership(otherAccount.address);
      expect.fail("Expected to throw");
    } catch (error) {
      expect(error.message).to.include('eventTicket._transferOwnership is not a function');
    }
  });

  // Preventing Unauthorized Ownership Transfer:
  it("Unauthorized ownership transfer should revert", async () => {
    const { eventTicket, deployer, otherAccount } = await deploy();

    // Attempt to transfer ownership from otherAccount and expect it to revert
    await expect(eventTicket.connect(otherAccount).transferOwnership(deployer.address)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  // Transfer Ownership:
  it("Owner should be able to transfer ownership to another account", async () => {
    const { eventTicket, deployer, otherAccount } = await deploy();

    // Transfer ownership to otherAccount
    await eventTicket.connect(deployer).transferOwnership(otherAccount.address);

    // Verify that the new owner is now otherAccount
    const newOwner = await eventTicket.owner();
    expect(newOwner).to.equal(otherAccount.address);
  });

  // Renouncing Ownership
  it("Owner should be able to renounce ownership", async () => {
    const { eventTicket, deployer } = await deploy();

    // Renounce ownership
    await eventTicket.connect(deployer).renounceOwnership();

    // Verify that the owner is now the zero address
    const newOwner = await eventTicket.owner();
    expect(newOwner).to.equal("0x0000000000000000000000000000000000000000");
  });

  // Preventing Zero-Address Ownership Transfer:
  it("Ownership transfer to zero address should revert", async () => {
    const { eventTicket, deployer } = await deploy();

    // Attempt to transfer ownership to the zero address and expect it to revert
    await expect(eventTicket.connect(deployer).transferOwnership("0x0000000000000000000000000000000000000000")).to.be.revertedWith('Ownable: new owner is the zero address');
  });

  // Verify Owner Modifier:
  it("Function with onlyOwner modifier should only be callable by the owner", async () => {
    const { eventTicket, deployer, otherAccount } = await deploy();

    // Attempt to call a function with onlyOwner modifier from otherAccount and expect it to revert
    await expect(eventTicket.connect(otherAccount).setSigner(otherAccount.address)).to.be.revertedWith('Ownable: caller is not the owner');
  });

});

describe("EventTicket", function () {

  describe("Deployment", () => {
    it("Deploy VerifySignature contract", async () => {
      const { eventTicket, deployer } = await deploy();
      console.log(`deployer addres  : ${await deployer.getAddress()}`);
      expect(await eventTicket).to.not.equal(0);
    });
  });

  describe("Test getMessageHash", () => {
    it("should return the correct message hash", async () => {
      const { eventTicket, deployer, otherAccount } = await deploy();

      // Define test inputs
      const to = otherAccount.address;

      // Calculate the expected message hash
      const expectedHash = ethers.utils.solidityKeccak256(
        ["address"],
        [to]
      );

      // Call the getMessageHash function
      const result = await eventTicket.getMessageHash(to);
      console.log("result", result)
      // Assert that the result matches the expected hash
      expect(result).to.equal(expectedHash, "Message hash is incorrect");
    });
  });

  describe("Test getEthSignedMessageHash", () => {
    it('should return the correct Ethereum signed message hash', async () => {
      const { eventTicket, deployer, otherAccount } = await deploy();

      // Calculate the message hash
      const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'));

      // Calculate the expected Ethereum signed message hash
      const prefix = '\x19Ethereum Signed Message:\n32';
      const expectedHash = ethers.utils.keccak256(
        ethers.utils.concat([ethers.utils.toUtf8Bytes(prefix), ethers.utils.arrayify(messageHash)])
      );

      // Call the getEthSignedMessageHash function
      const result = await eventTicket.getEthSignedMessageHash(messageHash);
      console.log("result", result)
      console.log("expectedHash", expectedHash)
      // Assert that the result matches the expected hash
      // assert.strictEqual(result, expectedHash, 'Ethereum signed message hash is incorrect');
      expect(result).to.equal(expectedHash, "Message hash is incorrect");

    });
  });

  describe("Test verify", () => {
    it('should verify a valid signature', async () => {
      const { eventTicket, deployer, otherAccount } = await deploy();
      const signer = deployer.address;
      console.log("signer", signer)
      const to = otherAccount.address;
      const messageHash = await eventTicket.getMessageHash(to);
      console.log("1) getMessageHash:", messageHash);
      const getEthSignedMessageHash = await eventTicket.getEthSignedMessageHash(messageHash);
      console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
      const signature = await deployer.signMessage(ethers.utils.arrayify(messageHash));
      console.log("3) Sign message hash (signature)", signature)

      const result = await eventTicket.verify(signer, messageHash, signature);
      expect(result, 'Signature is not valid').to.be.true
    });
  });

  it("Should let signature replay happen (SignatureMalleability)", async function () {
    const { eventTicket, deployer, otherAccount } = await deploy();
    const signer = deployer.address;
    console.log("signer", signer)
    const to = otherAccount.address;
    const messageHash = await eventTicket.getMessageHash(to);
    console.log("1) getMessageHash:", messageHash);
    const getEthSignedMessageHash = await eventTicket.getEthSignedMessageHash(messageHash);
    console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
    const signature = await deployer.signMessage(ethers.utils.arrayify(messageHash));
    console.log("3) Sign message hash (signature)", signature)
    // const SignatureMalleability = await eventTicket.getMalleabilitySignature(signature);
    // console.log("4) SignatureMalleability message hash (signature)", SignatureMalleability)
    // const RSV = await eventTicket.getRSV(signature);
    // console.log("5) RSV", RSV)


    const result = await eventTicket.verify(signer, messageHash, signature);
    expect(result, 'Signature is not valid').to.be.true
  });


  it("Should mintAllowList", async function () {
    const { eventTicket, deployer, otherAccount } = await deploy();
    const signer = deployer.address;

    console.log("signer", signer)
    const messageHash = await eventTicket.getMessageHash(otherAccount.address);
    const messageHash2 = await eventTicket.getMessageHash(deployer.address);
    console.log("totalSupply before", await eventTicket.totalSupply())

    console.log("Should mintAllowList")
    console.log("1) getMessageHash:", messageHash);
    const getEthSignedMessageHash = await eventTicket.getEthSignedMessageHash(messageHash);
    console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
    const signature = await deployer.signMessage(ethers.utils.arrayify(messageHash));
    const signature2 = await deployer.signMessage(ethers.utils.arrayify(messageHash2));
    console.log("3) Sign message hash (signature)", signature)
    // const SignatureMalleability = await eventTicket.getMalleabilitySignature(signature);
    // console.log("4) SignatureMalleability message hash (signature)", SignatureMalleability)



    const malsig = getMalleabilitySignature(signature);
    console.log("SignatureMalleabilityJS", malsig);




    await eventTicket.setSigner(deployer.address)
    const mintAllowList = await eventTicket.connect(otherAccount).mintAllowList(otherAccount.address, signature, {
      value: parseEther("1"),
    });

    // const mintAllowList12 = await eventTicket.connect(otherAccount).mintAllowList(otherAccount.address, signature, {
    //   value: parseEther("1"),
    // });

    const mintAllowList2 = await eventTicket.connect(otherAccount).mintAllowList(otherAccount.address, malsig, {
      value: parseEther("1"),
    });
    // console.log("mintAllowList", mintAllowList)
    console.log("totalSupply after", await eventTicket.totalSupply())

    const result = await eventTicket.verify(signer, messageHash, signature);
    expect(result, 'Signature is not valid').to.be.true
  });
});