const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { arrayify, parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Token contract ERC20", function () {

    async function deploy() {
        /// Get accounts
        let [deployer, buyer, recipient, userAddress, relayerAddress, recipientAddress] = await ethers.getSigners();
        let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
        /// Deploy testing contracts
        const ERC20Token = await ethers.getContractFactory("ERC20Token");
        const erc20Token = await ERC20Token.connect(deployer).deploy();

        return { erc20Token, buyer, deployer, recipient, ZERO_ADDRESS, userAddress, relayerAddress, recipientAddress };
    }

    describe("Deployment", function () {

        it("Should set the right owner", async function () {
            const { erc20Token, deployer } = await deploy();
            expect(await erc20Token.balanceOf(deployer.address)).to.equal(parseEther("1000000"));
        });

        it("Should set the total supply", async function () {
            const { erc20Token, deployer } = await deploy();
            expect(await erc20Token.totalSupply()).to.equal(parseEther("1000000"));
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            const { erc20Token, deployer, buyer } = await deploy();
            await erc20Token.transfer(buyer.address, parseEther("100"));
            expect(await erc20Token.balanceOf(deployer.address)).to.equal(parseEther("999900"));
            expect(await erc20Token.balanceOf(buyer.address)).to.equal(parseEther("100"));
        });

        it("Should fail if send token to zero address", async function () {
            const { erc20Token, deployer, buyer, ZERO_ADDRESS } = await deploy();
            await expect(erc20Token.transfer(ZERO_ADDRESS, parseEther("1000001"))).to.be.revertedWith('ERC20: transfer to the zero address')
        });

        it("Should fail if sender doesn’t have enough tokens", async function () {
            const { erc20Token, deployer, buyer } = await deploy();
            const initialOwnerBalance = await erc20Token.balanceOf(deployer.address);

            await expect(erc20Token.transfer(buyer.address, parseEther("1000001"))).to.be.revertedWith('ERC20: transfer amount exceeds balance')
            expect(await erc20Token.balanceOf(deployer.address)).to.equal(initialOwnerBalance);
        });

        it("Should update allowance", async function () {
            const { erc20Token, deployer, buyer } = await deploy();
            await erc20Token.approve(buyer.address, 100);
            expect(await erc20Token.allowance(deployer.address, buyer.address)).to.equal(100);
        });

        it("Should transfer tokens from one account to another with allowance", async function () {
            const { erc20Token, deployer, buyer } = await deploy();
            await erc20Token.connect(deployer).approve(buyer.address, parseEther("100"));
            await erc20Token.connect(buyer).transferFrom(deployer.address, buyer.address, parseEther("100"));

            expect(await erc20Token.balanceOf(deployer.address)).to.equal(parseEther("999900"));
            expect(await erc20Token.balanceOf(buyer.address)).to.equal(parseEther("100"));
            expect(await erc20Token.allowance(deployer.address, buyer.address)).to.equal(0);
        });

        it("Should fail if sender doesn’t have enough allowance", async function () {
            const { erc20Token, deployer, buyer } = await deploy();
            await erc20Token.approve(buyer.address, 99);

            await expect(
                erc20Token.transferFrom(deployer.address, buyer.address, 100)
            ).to.be.revertedWith("ERC20: insufficient allowance");
        });
    });

    describe("Mint and Burn", function () {
        // Mint tokens
        it("Should mint tokens", async function () {
            const { erc20Token, deployer, buyer } = await deploy();
            const initialBuyerBalance = await erc20Token.balanceOf(buyer.address);

            await erc20Token.connect(deployer).mint(buyer.address, parseEther("100"));
            expect(await erc20Token.balanceOf(buyer.address)).to.equal(initialBuyerBalance.add(parseEther("100")));
        });

        // Burn tokens 
        it("Should burn tokens", async function () {
            const { erc20Token, deployer, } = await deploy();
            const initialBuyerBalance = await erc20Token.balanceOf(deployer.address);
            await erc20Token.connect(deployer).burn(parseEther("50"));
            expect(await erc20Token.balanceOf(deployer.address)).to.equal(initialBuyerBalance.sub(parseEther("50")));
        });
    });
});