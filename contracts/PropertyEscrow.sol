// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PropertyEscrow
 * @dev Escrow contract for property transactions
 */
contract PropertyEscrow {
    enum ReleaseCondition { NONE, INSPECTION_PASSED, FUNDS_CONFIRMED, DEED_TRANSFERRED }
    
    struct EscrowDetails {
        address buyer;
        address seller;
        uint256 escrowAmount;
        uint256 depositAmount;
        uint256 releaseTime;
        uint256 createdAt;
        bool buyerApproved;
        bool sellerApproved;
        bool inspectionPassed;
        bool released;
        bool cancelled;
        mapping(ReleaseCondition => bool) conditionsMetDetails;
    }

    string public propertyId;
    address public escrowAgent;
    
    mapping(string => EscrowDetails) public escrows;
    
    event EscrowCreated(
        string indexed propertyId,
        address indexed buyer,
        address indexed seller,
        uint256 escrowAmount,
        uint256 depositAmount
    );
    
    event EscrowApproved(string indexed propertyId, address indexed approver);
    event InspectionApproved(string indexed propertyId);
    event EscrowReleased(string indexed propertyId, address indexed recipient, uint256 amount);
    event EscrowCancelled(string indexed propertyId);
    event DepositReturned(string indexed propertyId, address indexed recipient, uint256 amount);

    modifier onlyEscrowAgent() {
        require(msg.sender == escrowAgent, "Only escrow agent can call this");
        _;
    }

    modifier onlyParties(string memory _propertyId) {
        EscrowDetails storage escrow = escrows[_propertyId];
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller || msg.sender == escrowAgent,
            "Only parties or escrow agent can call this"
        );
        _;
    }

    /**
     * @dev Initialize escrow
     */
    constructor(address _escrowAgent) {
        escrowAgent = _escrowAgent;
    }

    /**
     * @dev Create new escrow
     */
    function createEscrow(
        string memory _propertyId,
        address _buyer,
        address _seller,
        uint256 _depositAmount,
        uint256 _releaseTime
    ) public payable onlyEscrowAgent {
        require(msg.value >= _depositAmount, "Insufficient deposit");
        require(_releaseTime > block.timestamp, "Release time must be in the future");
        
        EscrowDetails storage escrow = escrows[_propertyId];
        require(escrow.createdAt == 0, "Escrow already exists for this property");
        
        escrow.buyer = _buyer;
        escrow.seller = _seller;
        escrow.escrowAmount = msg.value;
        escrow.depositAmount = _depositAmount;
        escrow.releaseTime = _releaseTime;
        escrow.createdAt = block.timestamp;
        escrow.buyerApproved = false;
        escrow.sellerApproved = false;
        escrow.inspectionPassed = false;
        escrow.released = false;
        escrow.cancelled = false;
        
        emit EscrowCreated(_propertyId, _buyer, _seller, msg.value, _depositAmount);
    }

    /**
     * @dev Approve escrow by buyer or seller
     */
    function approveEscrow(string memory _propertyId) public onlyParties(_propertyId) {
        EscrowDetails storage escrow = escrows[_propertyId];
        require(!escrow.released && !escrow.cancelled, "Escrow is already processed");
        
        if (msg.sender == escrow.buyer) {
            escrow.buyerApproved = true;
        } else if (msg.sender == escrow.seller) {
            escrow.sellerApproved = true;
        }
        
        emit EscrowApproved(_propertyId, msg.sender);
    }

    /**
     * @dev Mark inspection as passed
     */
    function approveInspection(string memory _propertyId) public onlyEscrowAgent {
        EscrowDetails storage escrow = escrows[_propertyId];
        require(!escrow.released && !escrow.cancelled, "Escrow is already processed");
        
        escrow.inspectionPassed = true;
        escrow.conditionsMetDetails[ReleaseCondition.INSPECTION_PASSED] = true;
        
        emit InspectionApproved(_propertyId);
    }

    /**
     * @dev Release funds to seller
     */
    function releaseToSeller(string memory _propertyId) public onlyEscrowAgent {
        EscrowDetails storage escrow = escrows[_propertyId];
        require(!escrow.released && !escrow.cancelled, "Escrow is already processed");
        require(escrow.buyerApproved && escrow.sellerApproved, "Both parties must approve");
        require(escrow.inspectionPassed, "Inspection must pass");
        
        escrow.released = true;
        uint256 sellerAmount = escrow.escrowAmount - escrow.depositAmount;
        
        (bool success, ) = payable(escrow.seller).call{value: sellerAmount}("");
        require(success, "Transfer to seller failed");
        
        emit EscrowReleased(_propertyId, escrow.seller, sellerAmount);
    }

    /**
     * @dev Return deposit to buyer
     */
    function returnDepositToBuyer(string memory _propertyId) public onlyEscrowAgent {
        EscrowDetails storage escrow = escrows[_propertyId];
        require(escrow.released || escrow.cancelled, "Escrow must be released or cancelled");
        
        (bool success, ) = payable(escrow.buyer).call{value: escrow.depositAmount}("");
        require(success, "Transfer to buyer failed");
        
        emit DepositReturned(_propertyId, escrow.buyer, escrow.depositAmount);
    }

    /**
     * @dev Cancel escrow and return funds
     */
    function cancelEscrow(string memory _propertyId) public onlyEscrowAgent {
        EscrowDetails storage escrow = escrows[_propertyId];
        require(!escrow.released && !escrow.cancelled, "Escrow is already processed");
        
        escrow.cancelled = true;
        
        (bool success, ) = payable(escrow.buyer).call{value: escrow.escrowAmount}("");
        require(success, "Refund failed");
        
        emit EscrowCancelled(_propertyId);
    }

    /**
     * @dev Get escrow status
     */
    function getEscrowStatus(string memory _propertyId) public view returns (
        address buyer,
        address seller,
        uint256 escrowAmount,
        uint256 depositAmount,
        uint256 releaseTime,
        bool buyerApproved,
        bool sellerApproved,
        bool inspectionPassed,
        bool released,
        bool cancelled
    ) {
        EscrowDetails storage escrow = escrows[_propertyId];
        return (
            escrow.buyer,
            escrow.seller,
            escrow.escrowAmount,
            escrow.depositAmount,
            escrow.releaseTime,
            escrow.buyerApproved,
            escrow.sellerApproved,
            escrow.inspectionPassed,
            escrow.released,
            escrow.cancelled
        );
    }

    /**
     * @dev Get contract balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Receive ether
     */
    receive() external payable {}
}
