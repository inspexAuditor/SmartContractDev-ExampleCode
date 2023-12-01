// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";
import "./SplitWallet.sol";

contract SplitPlatform {

    event CreateSplit(uint256 indexed walletId, address indexed walletAddress, address[] owners, uint256[] percents);
    event Deposit(uint256 indexed walletId, uint256 amount);
    event Distribute(uint256 indexed walletId, uint256 totalAmount);

    /// Minimize data by storing only the hash of the verified data
    struct SplitWalletData {
        bytes32 hash;
        SplitWallet wallet;
    }
    
    uint256 public nextId;
    mapping(uint256 => SplitWalletData) private _splitWalletDataById;
    mapping(address => uint256) public balances;

    function calculateHash(
        address[] memory accounts, 
        uint256[] memory percents
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(accounts, percents));
    }

    function createSplit(
        address[] memory accounts, 
        uint256[] memory percents
    ) external returns(uint256) {
        /// Verify data
        require(accounts.length == percents.length, "Invalid arrays' length");
        uint256 sumPercent;
        for (uint256 i ; i< percents.length ; ++i){
            sumPercent += percents[i];
        }
        require(sumPercent == 100, "Sum of percents array should be equal to 100%");
        /// Prepare data
        uint256 walletId = nextId++;
        bytes32 hash = calculateHash(accounts,percents);
        /// Store data
        SplitWalletData storage data = _splitWalletDataById[walletId];
        data.hash = hash;
        data.wallet = new SplitWallet(walletId, accounts);
        emit CreateSplit(walletId, address(data.wallet), accounts, percents);
        return walletId;
    }

    function deposit(uint256 walletId) external payable {
        require(walletId < nextId, "Wallet ID not exist");
        require(msg.value > 0, "Invalid value");
        address wallet = address(_splitWalletDataById[walletId].wallet);
        balances[wallet] += msg.value;
        emit Deposit(walletId, msg.value);
    }

    function distribute(
        uint256 walletId, 
        address[] memory accounts, 
        uint256[] memory percents
    ) external returns (uint256 totalAmount){
        require(walletId < nextId, "Wallet ID not exist");
        SplitWalletData memory data = _splitWalletDataById[walletId];
        /// Validating input data with the hash of verified data
        /// What could go wrong, right?
        require(data.hash == calculateHash(accounts,percents), "Invalid distribute data");
        require(address(data.wallet) == msg.sender, "Only wallet");
        require(balances[msg.sender] > 0, "Invalid balance");
        totalAmount = balances[msg.sender];
        /// Distribute token to owners
        for(uint i ; i<accounts.length ; ++i) {
            address to = accounts[i];
            uint amount = totalAmount * percents[i] / 100;
            console.log("amount to transfer");
            console.log(address(this).balance);
            console.log(amount);
            (bool sent, ) = to.call{value: amount}("");
            require(sent, "Failed to send Ether");
        }
        balances[msg.sender] = 0;
        emit Distribute(walletId, totalAmount);
        return totalAmount;
    }

}