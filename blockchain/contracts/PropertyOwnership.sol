// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PropertyOwnership
 * @dev Track and manage property ownership
 */
contract PropertyOwnership is Ownable {
    struct OwnershipRecord {
        address owner;
        uint256 ownershipPercentage;
        uint256 acquiredAt;
        bool active;
    }

    struct PropertyRecord {
        string propertyId;
        uint256 totalValue;
        uint256 createdAt;
        address[] owners;
        mapping(address => OwnershipRecord) ownershipDetails;
    }

    mapping(string => PropertyRecord) public properties;
    mapping(address => string[]) public ownerProperties;

    event PropertyRegistered(string indexed propertyId, uint256 totalValue);
    event OwnershipTransferred(
        string indexed propertyId,
        address indexed from,
        address indexed to,
        uint256 percentage
    );
    event OwnershipAdded(
        string indexed propertyId,
        address indexed owner,
        uint256 percentage
    );
    event OwnershipRemoved(
        string indexed propertyId,
        address indexed owner
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Register a new property
     */
    function registerProperty(string memory _propertyId, uint256 _totalValue, address[] memory _initialOwners, uint256[] memory _percentages) public onlyOwner {
        require(_initialOwners.length == _percentages.length, "Arrays must have same length");
        require(_initialOwners.length > 0, "Must have at least one owner");

        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < _percentages.length; i++) {
            require(_initialOwners[i] != address(0), "Invalid owner");
            require(_percentages[i] > 0, "Percentage must be positive");
            for (uint256 j = 0; j < i; j++) {
                require(_initialOwners[j] != _initialOwners[i], "Duplicate owner");
            }
            totalPercentage += _percentages[i];
        }
        require(totalPercentage == 100, "Percentages must sum to 100");

        PropertyRecord storage property = properties[_propertyId];
        require(property.createdAt == 0, "Property already exists");

        property.propertyId = _propertyId;
        property.totalValue = _totalValue;
        property.createdAt = block.timestamp;

        for (uint256 i = 0; i < _initialOwners.length; i++) {
            property.owners.push(_initialOwners[i]);
            property.ownershipDetails[_initialOwners[i]] = OwnershipRecord({
                owner: _initialOwners[i],
                ownershipPercentage: _percentages[i],
                acquiredAt: block.timestamp,
                active: true
            });
            ownerProperties[_initialOwners[i]].push(_propertyId);
        }

        emit PropertyRegistered(_propertyId, _totalValue);
    }

    /**
     * @dev Transfer ownership from one owner to another
     */
    function transferOwnership(
        string memory _propertyId,
        address _from,
        address _to,
        uint256 _percentage
    ) public {
        PropertyRecord storage property = properties[_propertyId];
        require(property.createdAt != 0, "Property does not exist");
        require(msg.sender == _from || msg.sender == owner(), "Not authorized to transfer this ownership");
        require(_to != address(0) && _to != _from, "Invalid recipient");
        require(_percentage > 0, "Percentage must be positive");
        
        OwnershipRecord storage fromOwner = property.ownershipDetails[_from];
        require(fromOwner.active, "Owner does not own this property");
        require(fromOwner.ownershipPercentage >= _percentage, "Insufficient ownership");

        // Reduce from owner
        fromOwner.ownershipPercentage -= _percentage;
        if (fromOwner.ownershipPercentage == 0) {
            fromOwner.active = false;
        }

        // Add to new owner
        OwnershipRecord storage toOwner = property.ownershipDetails[_to];
        if (toOwner.owner == address(0)) {
            property.owners.push(_to);
            ownerProperties[_to].push(_propertyId);
        }
        
        toOwner.owner = _to;
        toOwner.ownershipPercentage += _percentage;
        toOwner.acquiredAt = block.timestamp;
        toOwner.active = true;

        emit OwnershipTransferred(_propertyId, _from, _to, _percentage);
    }

    /**
     * @dev Add co-owner
     */
    function addCoOwner(
        string memory _propertyId,
        address _newOwner,
        uint256 _percentage
    ) public {
        PropertyRecord storage property = properties[_propertyId];
        require(property.createdAt != 0, "Property does not exist");
        require(_newOwner != address(0), "Invalid new owner");
        require(_percentage > 0, "Percentage must be positive");
        OwnershipRecord storage sourceOwner = property.ownershipDetails[msg.sender];
        require(sourceOwner.active && sourceOwner.ownershipPercentage >= _percentage, "Insufficient caller ownership");
        sourceOwner.ownershipPercentage -= _percentage;
        if (sourceOwner.ownershipPercentage == 0) sourceOwner.active = false;

        // Add new owner
        OwnershipRecord storage newOwner = property.ownershipDetails[_newOwner];
        if (newOwner.owner == address(0)) {
            property.owners.push(_newOwner);
            ownerProperties[_newOwner].push(_propertyId);
        }

        newOwner.owner = _newOwner;
        newOwner.ownershipPercentage += _percentage;
        newOwner.acquiredAt = block.timestamp;
        newOwner.active = true;

        emit OwnershipAdded(_propertyId, _newOwner, _percentage);
    }

    /**
     * @dev Get property owners
     */
    function getPropertyOwners(string memory _propertyId) public view returns (
        address[] memory owners,
        uint256[] memory percentages
    ) {
        PropertyRecord storage property = properties[_propertyId];
        require(property.createdAt != 0, "Property does not exist");

        uint256 activeCount = 0;
        for (uint256 i = 0; i < property.owners.length; i++) {
            if (property.ownershipDetails[property.owners[i]].active) {
                activeCount++;
            }
        }

        owners = new address[](activeCount);
        percentages = new uint256[](activeCount);

        uint256 index = 0;
        for (uint256 i = 0; i < property.owners.length; i++) {
            address owner = property.owners[i];
            if (property.ownershipDetails[owner].active) {
                owners[index] = owner;
                percentages[index] = property.ownershipDetails[owner].ownershipPercentage;
                index++;
            }
        }
    }

    /**
     * @dev Get owner's percentage
     */
    function getOwnershipPercentage(string memory _propertyId, address _owner) public view returns (uint256) {
        PropertyRecord storage property = properties[_propertyId];
        require(property.createdAt != 0, "Property does not exist");
        
        OwnershipRecord storage record = property.ownershipDetails[_owner];
        if (!record.active) return 0;
        return record.ownershipPercentage;
    }

    /**
     * @dev Get owner's properties
     */
    function getOwnerProperties(address _owner) public view returns (string[] memory) {
        return ownerProperties[_owner];
    }

    /**
     * @dev Get property details
     */
    function getPropertyDetails(string memory _propertyId) public view returns (
        string memory propertyId,
        uint256 totalValue,
        uint256 createdAt,
        uint256 ownerCount
    ) {
        PropertyRecord storage property = properties[_propertyId];
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < property.owners.length; i++) {
            if (property.ownershipDetails[property.owners[i]].active) {
                activeCount++;
            }
        }

        return (
            property.propertyId,
            property.totalValue,
            property.createdAt,
            activeCount
        );
    }
}
