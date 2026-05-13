// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PropertyLease
 * @dev Automated lease agreement contract
 */
contract PropertyLease {
    enum LeaseStatus { PENDING, ACTIVE, COMPLETED, TERMINATED }

    struct LeaseAgreement {
        string propertyId;
        address landlord;
        address tenant;
        uint256 monthlyRent;
        uint256 securityDeposit;
        uint256 startDate;
        uint256 endDate;
        uint256 rentalPeriodDays;
        LeaseStatus status;
        uint256 createdAt;
        bool depositReturned;
    }

    struct RentPayment {
        uint256 amount;
        uint256 dueDate;
        uint256 paidDate;
        bool paid;
    }

    mapping(string => LeaseAgreement) public leases;
    mapping(string => RentPayment[]) public rentPayments;
    mapping(address => string[]) public tenantLeases;
    mapping(address => string[]) public landlordLeases;

    event LeaseCreated(
        string indexed propertyId,
        address indexed landlord,
        address indexed tenant,
        uint256 monthlyRent,
        uint256 startDate,
        uint256 endDate
    );

    event RentPaid(
        string indexed leaseId,
        address indexed tenant,
        uint256 amount,
        uint256 paidDate
    );

    event DepositReturned(
        string indexed leaseId,
        address indexed tenant,
        uint256 amount
    );

    event LeaseTerminated(
        string indexed leaseId,
        string reason
    );

    /**
     * @dev Create a new lease agreement
     */
    function createLease(
        string memory _propertyId,
        address _landlord,
        address _tenant,
        uint256 _monthlyRent,
        uint256 _securityDeposit,
        uint256 _startDate,
        uint256 _rentalPeriodDays
    ) public payable {
        require(msg.value >= _securityDeposit, "Insufficient deposit");
        require(_startDate >= block.timestamp, "Start date must be in future");
        require(_monthlyRent > 0, "Monthly rent must be greater than 0");

        LeaseAgreement storage lease = leases[_propertyId];
        require(lease.createdAt == 0, "Lease already exists for property");

        uint256 endDate = _startDate + (_rentalPeriodDays * 1 days);

        lease.propertyId = _propertyId;
        lease.landlord = _landlord;
        lease.tenant = _tenant;
        lease.monthlyRent = _monthlyRent;
        lease.securityDeposit = _securityDeposit;
        lease.startDate = _startDate;
        lease.endDate = endDate;
        lease.rentalPeriodDays = _rentalPeriodDays;
        lease.status = LeaseStatus.PENDING;
        lease.createdAt = block.timestamp;
        lease.depositReturned = false;

        // Create rent payment schedule
        uint256 currentDate = _startDate;
        uint256 monthCount = 0;
        while (currentDate < endDate) {
            uint256 dueDate = _startDate + ((monthCount + 1) * 30 days);
            if (dueDate > endDate) dueDate = endDate;

            rentPayments[_propertyId].push(RentPayment({
                amount: _monthlyRent,
                dueDate: dueDate,
                paidDate: 0,
                paid: false
            }));

            currentDate = dueDate;
            monthCount++;
        }

        tenantLeases[_tenant].push(_propertyId);
        landlordLeases[_landlord].push(_propertyId);

        emit LeaseCreated(_propertyId, _landlord, _tenant, _monthlyRent, _startDate, endDate);
    }

    /**
     * @dev Pay rent
     */
    function payRent(string memory _leaseId, uint256 _paymentIndex) public payable {
        LeaseAgreement storage lease = leases[_leaseId];
        require(lease.createdAt != 0, "Lease does not exist");
        require(msg.sender == lease.tenant, "Only tenant can pay rent");
        require(lease.status == LeaseStatus.ACTIVE, "Lease is not active");
        
        RentPayment[] storage payments = rentPayments[_leaseId];
        require(_paymentIndex < payments.length, "Invalid payment index");

        RentPayment storage payment = payments[_paymentIndex];
        require(!payment.paid, "Rent already paid");
        require(msg.value >= payment.amount, "Insufficient payment");

        payment.paid = true;
        payment.paidDate = block.timestamp;

        // Transfer to landlord
        (bool success, ) = payable(lease.landlord).call{value: payment.amount}("");
        require(success, "Transfer failed");

        // Return excess
        if (msg.value > payment.amount) {
            (bool successRefund, ) = payable(msg.sender).call{value: msg.value - payment.amount}("");
            require(successRefund, "Refund failed");
        }

        emit RentPaid(_leaseId, msg.sender, payment.amount, block.timestamp);
    }

    /**
     * @dev Activate lease
     */
    function activateLease(string memory _leaseId) public {
        LeaseAgreement storage lease = leases[_leaseId];
        require(lease.createdAt != 0, "Lease does not exist");
        require(msg.sender == lease.landlord || msg.sender == lease.tenant, "Only parties can activate");
        require(lease.status == LeaseStatus.PENDING, "Lease is not pending");

        lease.status = LeaseStatus.ACTIVE;
    }

    /**
     * @dev Return security deposit
     */
    function returnDeposit(string memory _leaseId) public {
        LeaseAgreement storage lease = leases[_leaseId];
        require(lease.createdAt != 0, "Lease does not exist");
        require(msg.sender == lease.landlord, "Only landlord can return deposit");
        require(!lease.depositReturned, "Deposit already returned");
        require(block.timestamp >= lease.endDate, "Lease must be completed");

        lease.depositReturned = true;

        (bool success, ) = payable(lease.tenant).call{value: lease.securityDeposit}("");
        require(success, "Transfer failed");

        emit DepositReturned(_leaseId, lease.tenant, lease.securityDeposit);
    }

    /**
     * @dev Terminate lease early
     */
    function terminateLease(string memory _leaseId, string memory _reason) public {
        LeaseAgreement storage lease = leases[_leaseId];
        require(lease.createdAt != 0, "Lease does not exist");
        require(msg.sender == lease.landlord || msg.sender == lease.tenant, "Only parties can terminate");
        require(lease.status != LeaseStatus.TERMINATED, "Lease already terminated");

        lease.status = LeaseStatus.TERMINATED;
        emit LeaseTerminated(_leaseId, _reason);
    }

    /**
     * @dev Get rent payment history
     */
    function getRentPayments(string memory _leaseId) public view returns (RentPayment[] memory) {
        return rentPayments[_leaseId];
    }

    /**
     * @dev Get pending rent payments
     */
    function getPendingRent(string memory _leaseId) public view returns (uint256) {
        RentPayment[] storage payments = rentPayments[_leaseId];
        uint256 pending = 0;

        for (uint256 i = 0; i < payments.length; i++) {
            if (!payments[i].paid && payments[i].dueDate <= block.timestamp) {
                pending += payments[i].amount;
            }
        }

        return pending;
    }

    /**
     * @dev Get lease details
     */
    function getLeaseDetails(string memory _leaseId) public view returns (
        address landlord,
        address tenant,
        uint256 monthlyRent,
        uint256 securityDeposit,
        uint256 startDate,
        uint256 endDate,
        LeaseStatus status
    ) {
        LeaseAgreement storage lease = leases[_leaseId];
        return (
            lease.landlord,
            lease.tenant,
            lease.monthlyRent,
            lease.securityDeposit,
            lease.startDate,
            lease.endDate,
            lease.status
        );
    }

    /**
     * @dev Get tenant's leases
     */
    function getTenantLeases(address _tenant) public view returns (string[] memory) {
        return tenantLeases[_tenant];
    }

    /**
     * @dev Get landlord's leases
     */
    function getLandlordLeases(address _landlord) public view returns (string[] memory) {
        return landlordLeases[_landlord];
    }

    /**
     * @dev Receive ether
     */
    receive() external payable {}
}
