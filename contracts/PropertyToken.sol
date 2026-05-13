// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PropertyToken
 * @dev ERC-20 token for fractional property ownership
 */
contract PropertyToken is ERC20, Ownable {
    uint8 private _decimals;
    string public propertyId;
    address public propertyManager;
    uint256 public totalPropertyValue;
    bool public dividendEnabled;
    bool public transferable;
    
    // Dividend tracking
    uint256 public totalDividendsPaid;
    mapping(address => uint256) public dividendsClaimed;
    
    event DividendPaid(address indexed to, uint256 amount);
    event DividendsClaimed(address indexed claimer, uint256 amount);
    event TransferabilityChanged(bool enabled);

    /**
     * @dev Initialize property token
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply
     * @param decimalsValue Number of decimals
     * @param _propertyId Property identifier
     * @param _totalValue Total property value in wei
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimalsValue,
        string memory _propertyId,
        uint256 _totalValue
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimalsValue;
        propertyId = _propertyId;
        propertyManager = msg.sender;
        totalPropertyValue = _totalValue;
        dividendEnabled = false;
        transferable = true;
        
        _mint(msg.sender, initialSupply * 10 ** uint256(decimalsValue));
    }

    /**
     * @dev Get token decimals
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Enable or disable dividends
     */
    function setDividendEnabled(bool enabled) public onlyOwner {
        dividendEnabled = enabled;
    }

    /**
     * @dev Set token transferability
     */
    function setTransferable(bool _transferable) public onlyOwner {
        transferable = _transferable;
        emit TransferabilityChanged(_transferable);
    }

    /**
     * @dev Transfer tokens
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(transferable || msg.sender == owner(), "Transfers are currently disabled");
        return super.transfer(to, amount);
    }

    /**
     * @dev Transfer from
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(transferable || from == owner(), "Transfers are currently disabled");
        return super.transferFrom(from, to, amount);
    }

    /**
     * @dev Pay dividend to all holders
     */
    function payDividend() public payable onlyOwner {
        require(dividendEnabled, "Dividends are disabled");
        require(msg.value > 0, "Dividend amount must be greater than 0");
        totalDividendsPaid += msg.value;
    }

    /**
     * @dev Calculate claimable dividends for a holder
     */
    function getClaimableDividends(address holder) public view returns (uint256) {
        uint256 balance = balanceOf(holder);
        if (balance == 0) return 0;
        
        uint256 proportion = (balance * 1e18) / totalSupply();
        uint256 claimable = (totalDividendsPaid * proportion) / 1e18;
        return claimable - dividendsClaimed[holder];
    }

    /**
     * @dev Claim dividends
     */
    function claimDividends() public {
        require(dividendEnabled, "Dividends are disabled");
        uint256 claimable = getClaimableDividends(msg.sender);
        require(claimable > 0, "No dividends to claim");
        
        dividendsClaimed[msg.sender] += claimable;
        
        (bool success, ) = payable(msg.sender).call{value: claimable}("");
        require(success, "Transfer failed");
        
        emit DividendsClaimed(msg.sender, claimable);
    }

    /**
     * @dev Mint new tokens
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Withdraw contract balance
     */
    function withdraw() public onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Receive ether
     */
    receive() external payable {}
}
