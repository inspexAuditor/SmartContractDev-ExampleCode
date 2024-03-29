const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { arrayify, parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("VerifySignature Token Transfer", function () {

  async function deploy() {
    /// Get accounts
    let [deployer, userAddress, relayerAddress, recipientAddress] = await ethers.getSigners();

    /// Deploy testing contracts
    const InsdexToken = await ethers.getContractFactory("InsdexToken");
    const insdexTokenContract = await InsdexToken.connect(deployer).deploy();
    const TokenSender = await ethers.getContractFactory("TokenSender");
    const tokenSenderContract = await TokenSender.connect(deployer).deploy();
    return { insdexTokenContract, tokenSenderContract, userAddress, relayerAddress, recipientAddress };
  }


  it("Should let user transfer tokens through a relayer with different nonces", async function () {
    // Deploy the contracts
    const { insdexTokenContract, tokenSenderContract, userAddress, relayerAddress, recipientAddress } = await deploy();

    console.log(userAddress.address)

    // Mint 10,000 tokens to user address (for testing)
    const tenThousandTokensWithDecimals = parseEther("10000");
    const userTokenContractInstance = insdexTokenContract.connect(userAddress);
    const mintTxn = await userTokenContractInstance.freeMint(
      tenThousandTokensWithDecimals
    );
    await mintTxn.wait();

    // Have user infinite approve the token sender contract for transferring 'InsdexToken'
    const approveTxn = await userTokenContractInstance.approve(
      tokenSenderContract.address,
      BigNumber.from(
        // This is uint256's max value (2^256 - 1) in hex
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    );
    await approveTxn.wait();

    // Have user sign message to transfer 10 tokens to recipient
    let nonce = 1;

    const transferAmountOfTokens = parseEther("10");
    const messageHash = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      insdexTokenContract.address,
      nonce
    );
    const signature = await userAddress.signMessage(arrayify(messageHash));

    // Have the relayer execute the transaction on behalf of the user
    const relayerSenderContractInstance =
      tokenSenderContract.connect(relayerAddress);
    const metaTxn = await relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      insdexTokenContract.address,
      nonce,
      signature
    );
    await metaTxn.wait();

    // Check the user's balance decreased, and recipient got 10 tokens
    let userBalance = await insdexTokenContract.balanceOf(userAddress.address);
    let recipientBalance = await insdexTokenContract.balanceOf(
      recipientAddress.address
    );

    expect(userBalance.eq(parseEther("9990"))).to.be.true;
    expect(recipientBalance.eq(parseEther("10"))).to.be.true;

    // Increment the nonce
    nonce++;

    // Have user sign a second message, with a different nonce, to transfer 10 more tokens
    const messageHash2 = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      insdexTokenContract.address,
      nonce
    );
    const signature2 = await userAddress.signMessage(arrayify(messageHash2));
    // Have the relayer execute the transaction on behalf of the user
    const metaTxn2 = await relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      insdexTokenContract.address,
      nonce,
      signature2
    );
    await metaTxn2.wait();

    // Check the user's balance decreased, and recipient got 10 tokens
    userBalance = await insdexTokenContract.balanceOf(userAddress.address);
    recipientBalance = await insdexTokenContract.balanceOf(
      recipientAddress.address
    );


    expect(userBalance.eq(parseEther("9980"))).to.be.true;
    expect(recipientBalance.eq(parseEther("20"))).to.be.true;
  });

  it("Should not let signature replay happen", async function () {
    // Deploy the contracts
    const { insdexTokenContract, tokenSenderContract, userAddress, relayerAddress, recipientAddress } = await deploy();

    // Mint 10,000 tokens to user address (for testing)
    const tenThousandTokensWithDecimals = parseEther("10000");
    const userTokenContractInstance = insdexTokenContract.connect(userAddress);
    const mintTxn = await userTokenContractInstance.freeMint(
      tenThousandTokensWithDecimals
    );
    await mintTxn.wait();

    // Have user infinite approve the token sender contract for transferring 'InsdexToken'
    const approveTxn = await userTokenContractInstance.approve(
      tokenSenderContract.address,
      BigNumber.from(
        // This is uint256's max value (2^256 - 1) in hex
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    );
    await approveTxn.wait();

    // Have user sign message to transfer 10 tokens to recipient
    let nonce = 1;

    const transferAmountOfTokens = parseEther("10");
    const messageHash = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      insdexTokenContract.address,
      nonce
    );

    const signature = await userAddress.signMessage(arrayify(messageHash));
    // Have the relayer execute the transaction on behalf of the user
    const relayerSenderContractInstance =
      tokenSenderContract.connect(relayerAddress);
    const metaTxn = await relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      insdexTokenContract.address,
      nonce,
      signature
    );
    await metaTxn.wait();

    // Have the relayer attempt to execute the same transaction again with the same signature
    // This time, we expect the transaction to be reverted because the signature has already been used.
    expect(relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      insdexTokenContract.address,
      nonce,
      signature
    )).to.be.revertedWith('Already executed!');
  });
});
