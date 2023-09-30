const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Attack Bank Contract", function () {

    async function deploy() {
        /// Get accounts
        let [deployer, user, attacker] = await ethers.getSigners();

        /// Deploy Bank contracts
        const Bank = await ethers.getContractFactory("Bank");
        const bank = await Bank.connect(deployer).deploy();

        /// Deploy Attack contracts
        const Attack = await ethers.getContractFactory("Attack");
        const attack = await Attack.connect(attacker).deploy(bank.address);

        return { bank, attack, user, attacker, deployer };
    }

    it("Should empty the balance of the good contract", async function () {
        const { bank, attack, user, attacker } = await deploy();

        // User deposits 10 ETH into Bank
        let tx = await bank.connect(user).addBalance({
            value: parseEther("10"),
        });
        await tx.wait();

        // Check that at this point the Bank's balance is 10 ETH
        let balanceETH = await ethers.provider.getBalance(bank.address);
        expect(balanceETH).to.equal(parseEther("10"));

        // Attacker calls the `attack` function on Attack
        // and sends 1 ETH
        tx = await attack.connect(attacker).attack({
            value: parseEther("1"),
        });
        await tx.wait();

        // Balance of the Bank's address is now zero
        balanceETH = await ethers.provider.getBalance(bank.address);
        expect(balanceETH).to.equal(BigNumber.from("0"));

        // Balance of Attack is now 11 ETH (10 ETH stolen + 1 ETH from attacker)
        balanceETH = await ethers.provider.getBalance(attack.address);
        expect(balanceETH).to.equal(parseEther("11"));
    });
});