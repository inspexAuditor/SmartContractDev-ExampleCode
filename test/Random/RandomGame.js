const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");
const { BigNumber, utils } = require("ethers");

describe("Attack", function () {

    async function deploy() {
        /// Get accounts
        let [deployer, user, attacker] = await ethers.getSigners();

        /// Deploy Bank contracts
        const RandomGame = await ethers.getContractFactory("RandomGame");
        const randomGame = await RandomGame.connect(deployer).deploy({ value: utils.parseEther("0.1") });

        /// Deploy Attack contracts
        const AttackRandomGame = await ethers.getContractFactory("AttackRandomGame");
        const attack = await AttackRandomGame.connect(attacker).deploy(randomGame.address);

        return { randomGame, attack };
    }

    it("Should be able to guess the exact number", async function () {
        // Deploy the Game contract
        const { randomGame, attack } = await deploy();

        // Attack the Game contract
        const tx = await attack.attack();
        await tx.wait();

        const balanceGame = await randomGame.getBalance();
        // Balance of the Game contract should be 0
        expect(balanceGame).to.equal(BigNumber.from("0"));
    });
});