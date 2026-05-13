// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VerificationRegistry
 * @dev Records receipt hashes on-chain so fiat transactions can be audited later.
 */
contract VerificationRegistry {
    struct VerificationRecord {
        bytes32 receiptHash;
        string paymentReference;
        string propertyId;
        string receiptId;
        uint256 recordedAt;
        address recorder;
    }

    mapping(bytes32 => VerificationRecord) private verificationRecords;
    mapping(bytes32 => bool) public verificationExists;

    event VerificationRecorded(
        bytes32 indexed verificationKey,
        bytes32 indexed receiptHash,
        string paymentReference,
        string propertyId,
        string receiptId,
        address recorder,
        uint256 recordedAt
    );

    function recordVerification(
        bytes32 receiptHash,
        string calldata paymentReference,
        string calldata propertyId,
        string calldata receiptId
    ) external returns (bytes32 verificationKey) {
        require(receiptHash != bytes32(0), "Invalid receipt hash");
        require(bytes(paymentReference).length > 0, "Missing payment reference");
        require(bytes(propertyId).length > 0, "Missing property id");
        require(bytes(receiptId).length > 0, "Missing receipt id");

        verificationKey = keccak256(
            abi.encodePacked(receiptHash, paymentReference, propertyId, receiptId)
        );
        require(!verificationExists[verificationKey], "Verification already exists");

        verificationRecords[verificationKey] = VerificationRecord({
            receiptHash: receiptHash,
            paymentReference: paymentReference,
            propertyId: propertyId,
            receiptId: receiptId,
            recordedAt: block.timestamp,
            recorder: msg.sender
        });
        verificationExists[verificationKey] = true;

        emit VerificationRecorded(
            verificationKey,
            receiptHash,
            paymentReference,
            propertyId,
            receiptId,
            msg.sender,
            block.timestamp
        );
    }

    function getVerification(bytes32 verificationKey)
        external
        view
        returns (
            bytes32 receiptHash,
            string memory paymentReference,
            string memory propertyId,
            string memory receiptId,
            uint256 recordedAt,
            address recorder
        )
    {
        require(verificationExists[verificationKey], "Verification not found");

        VerificationRecord storage record = verificationRecords[verificationKey];
        return (
            record.receiptHash,
            record.paymentReference,
            record.propertyId,
            record.receiptId,
            record.recordedAt,
            record.recorder
        );
    }
}
