// // SPDX-License-Identifier: UNLICENSED
// pragma solidity 0.7.0;

// contract BadExample {
    
//     address public admin;
//     uint256 public percentReward;
//     mapping (address => bool) public whitelist;
//     mapping (address => uint256) public balanceOf;
//     mapping(address => uint256) public lastDepositTime;

//     event AdminSet(address indexed oldAdmin, address indexed newAdmin);

//     constructor(address newAdmin) payable {
//         admin = newAdmin;
//     }

//     modifier onlyWhitelist() {
//         require(whitelist[msg.sender], "Caller is not in the whitelist");
//         _;
//     }

//     modifier onlyAdmin() {
//         require(msg.sender == admin, "Caller is not an admin");
//         _;
//     }

//     function changeAdmin(address newAdmin) public onlyAdmin {
//         admin = newAdmin;
//         emit AdminSet(admin, newAdmin);
//     }

//     function setReward(uint256 newPercentReward) public onlyAdmin {
//         percentReward = newPercentReward;
//     }


//     function addWhitelist(address[] memory users) external onlyAdmin {
//         for(uint i=0; i<users.length ; ++i){
//             whitelist[users[i]] = true;
//         }
//     }

//     function removeWhitelist(address[] memory users) external onlyAdmin {
//         for(uint i=0; i<users.length ; ++i){
//             whitelist[users[i]] = false;
//         }
//     }
    
//     function deposit(address _receiver) external payable {
//         require(msg.value > 0, "invalid balance");
//         balanceOf[_receiver] += msg.value;
//         lastDepositTime[_receiver] = block.timestamp; 
//     }

//     function withdraw(address _to, uint256 _amount) internal onlyWhitelist {
//         require(balanceOf[msg.sender] == _amount, "Incorrect balance");
//         uint256 timeElapsed = block.timestamp - lastDepositTime[msg.sender];
//         uint256 reward = 0;
//         if (timeElapsed >= 1 days) {
//             reward = percentReward / 100 * _amount;
//         }
//         uint256 totalAmount = _amount + reward;
//         (bool sent, ) = payable(_to).call{value: _amount}("");
//         require(sent, "Failed to send Ether");
//         balanceOf[msg.sender] -= totalAmount;
//     }

// }
