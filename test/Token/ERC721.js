const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { arrayify, parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Token contract ERC721", function () {

    async function deploy() {
        /// Get accounts
        let [deployer, buyer, recipient, userAddress, relayerAddress, recipientAddress] = await ethers.getSigners();
        let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
        /// Deploy testing contracts
        const ERC721Token = await ethers.getContractFactory("ERC721Token");
        const erc721Token = await ERC721Token.connect(deployer).deploy();
        return { erc721Token, buyer, deployer, recipient, ZERO_ADDRESS, userAddress, relayerAddress, recipientAddress };
    }

    describe("Deployment", function () {

        it("Should set the right owner", async function () {
            const { erc721Token, deployer } = await deploy();
            expect(await erc721Token.balanceOf(deployer.address)).to.equal(1);
        });

        it("Should set the total supply", async function () {
            const { erc721Token, deployer, buyer } = await deploy();
            await erc721Token.connect(deployer).safeMint(deployer.address);
            await erc721Token.connect(deployer).safeMint(buyer.address);
            let balanceOfDeployer = parseInt(await erc721Token.balanceOf(deployer.address))
            let balanceOfbBuyer = parseInt(await erc721Token.balanceOf(buyer.address))
            expect(balanceOfDeployer + balanceOfbBuyer).to.equal(await erc721Token.totalSupply());
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            const { erc721Token, deployer, buyer } = await deploy();
            await erc721Token.transferFrom(deployer.address,buyer.address, 0);
            expect(await erc721Token.balanceOf(deployer.address)).to.equal(0);
            expect(await erc721Token.balanceOf(buyer.address)).to.equal(1);
        });

        it("Should fail if send token to zero address", async function () {
            const { erc721Token, deployer, buyer, ZERO_ADDRESS } = await deploy();
            await expect(erc721Token.connect(deployer).transferFrom(deployer.address,ZERO_ADDRESS, 0)).to.be.revertedWith('ERC721: transfer to the zero address')
        });


        it("Should transfer tokens from one account to another with approve", async function () {
            const { erc721Token, deployer, buyer } = await deploy();
            await erc721Token.connect(deployer).approve(buyer.address, 0);
            await erc721Token.connect(buyer).transferFrom(deployer.address, buyer.address, 0);

            expect(await erc721Token.balanceOf(deployer.address)).to.equal(0);
            expect(await erc721Token.balanceOf(buyer.address)).to.equal(1);
        });

        it("Should fail if token doesn’t approve by the owner", async function () {
            const { erc721Token, deployer, buyer } = await deploy();
            await erc721Token.approve(buyer.address, 0);

            await expect(erc721Token.transferFrom(deployer.address, buyer.address, 10)).to.be.revertedWith("ERC721: invalid token ID");
        });
    });

    describe("Mint and Burn", function () {
        // Mint tokens
        it("Should mint tokens", async function () {
            const { erc721Token, deployer, buyer } = await deploy();
            const initialBuyerBalance = await erc721Token.balanceOf(buyer.address);

            await erc721Token.connect(deployer).safeMint(buyer.address);
            expect(await erc721Token.balanceOf(buyer.address)).to.equal(initialBuyerBalance.add(1));
        });

        // Burn tokens 
        it("Should burn tokens", async function () {
            const { erc721Token, deployer, } = await deploy();
            const initialBuyerBalance = await erc721Token.balanceOf(deployer.address);
            await erc721Token.connect(deployer).burn(0);
            expect(await erc721Token.balanceOf(deployer.address)).to.equal(initialBuyerBalance.sub(1));
        });
    });
});