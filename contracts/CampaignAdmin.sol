// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "./Campaign.sol";

contract CampaignAdmin {
    constructor(){}

    event newCampaignCreated(address campaign);

    function newCampaign(
        string memory _campaignName,
        uint256 _targetAmount,
        uint256 _closeDate) public payable {
        Campaign campaign = new Campaign(_campaignName, _targetAmount, _closeDate, msg.sender);
        emit newCampaignCreated(address(campaign));
    }
}