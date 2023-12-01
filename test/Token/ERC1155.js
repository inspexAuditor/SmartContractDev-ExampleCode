const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC1155Token", function () {
    let ERC1155Token;
    let myToken;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        myToken = await ERC1155Token.deploy();
        await myToken.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await myToken.owner()).to.equal(owner.address);
        });
    });

    describe("Transactions", function () {
        it("Should mint tokens", async function () {
            await myToken.mint(addr1.address, 1, 100, "0x00");
            expect(await myToken.balanceOf(addr1.address, 1)).to.equal(100);
        });

        it("Should burn tokens", async function () {
            await myToken.mint(addr1.address, 1, 100, "0x00");
            await myToken.burn(addr1.address, 1, 50);
            expect(await myToken.balanceOf(addr1.address, 1)).to.equal(50);
        });
    });

    describe("Token Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            const tokenId = 1;
            const amount = 100;

            // Mint tokens to addr1
            await myToken.mint(addr1.address, tokenId, amount, "0x00");

            // Transfer tokens from addr1 to addr2
            await myToken.connect(addr1).safeTransferFrom(addr1.address, addr2.address, tokenId, 50, "0x00");

            // Check balances
            expect(await myToken.balanceOf(addr1.address, tokenId)).to.equal(50);
            expect(await myToken.balanceOf(addr2.address, tokenId)).to.equal(50);
        });

        it("Should fail for unauthorized transfers", async function () {
            const tokenId = 1;
            const amount = 100;
        
            // Mint tokens to addr1
            await myToken.mint(addr1.address, tokenId, amount, "0x00");
        
            // Attempt to transfer tokens from addr1 to addr2 using addr2 (which should fail)
            await expect(
                myToken.connect(addr2).safeTransferFrom(addr1.address, addr2.address, tokenId, 50, "0x00")
            ).to.be.revertedWith("ERC1155: caller is not token owner or approved");
        });
        
    });

});
