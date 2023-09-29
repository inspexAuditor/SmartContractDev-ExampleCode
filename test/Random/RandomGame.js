const {ethers, waffle} = require("hardhat");
const {expect} = require("chai");
const {BigNumber, utils} = require("ethers");

describe("Attack", function () {
    it("Should be able to guess the exact number", async function () {
        // Deploy the Game contract
        const RandomGame = await ethers.getContractFactory("RandomGame");
        const _randomGame = await RandomGame.deploy({value: utils.parseEther("0.1")});
        await _randomGame.deployed();

        console.log("Game contract address", _randomGame.address);

        // Deploy the attack contract
        const Attack = await ethers.getContractFactory("AttackRandomGame");
        const _attack = await Attack.deploy(_randomGame.address);

        console.log("Attack contract address", _attack.address);

        // Attack the Game contract
        const tx = await _attack.attack();
        await tx.wait();

        const balanceGame = await _randomGame.getBalance();
        // Balance of the Game contract should be 0
        expect(balanceGame).to.equal(BigNumber.from("0"));
    });
});