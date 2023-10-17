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
  const { r, s, v } = splitSignature(sig);

  let adjustedV = ethers.BigNumber.from(v).toNumber();
  if (adjustedV === 27) adjustedV++;
  else if (adjustedV === 28) adjustedV--;

  const sBN = ethers.BigNumber.from(s);
  const malsigS = ethers.constants.MaxUint256.sub(sBN).toHexString();

  const malsig = ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes32', 'uint8'], [r, malsigS, adjustedV]);
  return malsig;
}







describe("EventTicket", function () {

  async function deploy() {
    /// Get accounts
    let [deployer, otherAccount] = await ethers.getSigners();

    /// Deploy testing contracts
    const EventTicket = await ethers.getContractFactory("EventTicket");
    const eventTicket = await EventTicket.connect(deployer).deploy();

    return { eventTicket, deployer, otherAccount };
  }

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
      const amount = 123;
      const message = "Hello, world!";
      const nonce = 1;

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
      const amount = 123;
      const message = 'Hello, world!';
      const nonce = 1;
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
    const amount = 123;
    const message = 'Hello, world!';
    const nonce = 1;
    const messageHash = await eventTicket.getMessageHash(to);
    console.log("1) getMessageHash:", messageHash);
    const getEthSignedMessageHash = await eventTicket.getEthSignedMessageHash(messageHash);
    console.log("2) getEthSignedMessageHash:", getEthSignedMessageHash);
    const signature = await deployer.signMessage(ethers.utils.arrayify(messageHash));
    console.log("3) Sign message hash (signature)", signature)
    const SignatureMalleability = await eventTicket.getMalleabilitySignature(signature);
    console.log("4) SignatureMalleability message hash (signature)", SignatureMalleability)
    const RSV = await eventTicket.getRSV(signature);
    console.log("5) RSV", RSV)


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
    const SignatureMalleability = await eventTicket.getMalleabilitySignature(signature);
    console.log("4) SignatureMalleability message hash (signature)", SignatureMalleability)



    const malsig = getMalleabilitySignature(signature);
    console.log("SignatureMalleabilityJS",malsig);




    await eventTicket.setSigner(deployer.address)
    const mintAllowList = await eventTicket.connect(otherAccount).mintAllowList(otherAccount.address, signature, {
      value: parseEther("1"),
    });

    // const mintAllowList12 = await eventTicket.connect(otherAccount).mintAllowList(otherAccount.address, signature, {
    //   value: parseEther("1"),
    // });

    const mintAllowList2 = await eventTicket.connect(otherAccount).mintAllowList(otherAccount.address, SignatureMalleability, {
      value: parseEther("1"),
    });
    // console.log("mintAllowList", mintAllowList)
    console.log("totalSupply after", await eventTicket.totalSupply())
    
    const result = await eventTicket.verify(signer, messageHash, signature);
    expect(result, 'Signature is not valid').to.be.true
  });
});