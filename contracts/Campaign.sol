// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./CharityToken.sol";

contract Campaign {
    string public campaignName;
    uint256 public targetAmount;
    uint256 public closeDate;
    address public campaignManager;
    ERC20 private charityToken;

    constructor (
        string memory _campaignName,
        uint256 _targetAmount,
        uint256 _closeDate,
        address _campaignManager
    ) {
        campaignName = _campaignName;
        targetAmount = _targetAmount * 1e2;
        closeDate = _closeDate;
        campaignManager = _campaignManager;
        charityToken = CharityToken(address());
    }

    event newDonation(address donor, uint256 amount);
    event newPayment(address receiver, uint256 amount);

    function donate(uint256 amount) public {
        require(charityToken.balanceOf(msg.sender) >= amount, "Not enough tokens");
        uint256 allowance = charityToken.allowance(msg.sender, address(this));
        require(allowance >= amount, "Check the token allowance");
        charityToken.transferFrom(msg.sender, address(this), amount);
    }

    function getCurrentAmount() public view returns (uint256){
        return charityToken.balanceOf(address(this));
    }

    function payment(address receiver, uint256 amount) public {
        require(msg.sender == campaignManager, "Unauthorised");
        require(charityToken.balanceOf(address(this)) > amount, "Not enough tokens");
        charityToken.transfer(receiver, amount);
        emit newPayment(receiver, amount);
    }
}
