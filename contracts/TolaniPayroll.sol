// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TolaniPayroll
 * @notice Handles recurring payroll operations using TUT tokens
 * @dev Employers register employees with a salary and pay interval. Employees can
 *      withdraw their earned wages on schedule. Designed for DAO contributor payments.
 */
contract TolaniPayroll is AccessControl, ReentrancyGuard {
    bytes32 public constant EMPLOYER_ROLE = keccak256("EMPLOYER_ROLE");

    struct Employee {
        uint256 salary;      // tokens per interval
        uint256 interval;    // pay interval in seconds
        uint256 lastPaid;    // timestamp of last withdrawal
        bool exists;
    }

    IERC20 public immutable token;
    mapping(address => Employee) public employees;
    uint256 public totalCommitment;
    uint256 public employeeCount;

    event EmployeeAdded(address indexed account, uint256 salary, uint256 interval);
    event EmployeeRemoved(address indexed account);
    event SalaryUpdated(address indexed account, uint256 oldSalary, uint256 newSalary);
    event IntervalUpdated(address indexed account, uint256 oldInterval, uint256 newInterval);
    event Paid(address indexed account, uint256 amount);
    event FundsDeposited(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    /**
     * @param tokenAddress The ERC20 token for payments
     * @param admin The admin address (typically DAO timelock)
     */
    constructor(address tokenAddress, address admin) {
        require(tokenAddress != address(0), "Invalid token");
        require(admin != address(0), "Invalid admin");
        
        token = IERC20(tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EMPLOYER_ROLE, admin);
    }

    /**
     * @notice Adds a new employee to the payroll
     * @param account Employee address
     * @param salary Amount of tokens per interval
     * @param interval Payment interval in seconds (e.g., 2592000 for monthly)
     */
    function addEmployee(address account, uint256 salary, uint256 interval) external onlyRole(EMPLOYER_ROLE) {
        require(account != address(0), "Invalid account");
        require(!employees[account].exists, "Already exists");
        require(salary > 0, "Invalid salary");
        require(interval > 0, "Invalid interval");
        
        employees[account] = Employee({
            salary: salary,
            interval: interval,
            lastPaid: block.timestamp,
            exists: true
        });
        
        totalCommitment += salary;
        employeeCount++;
        
        emit EmployeeAdded(account, salary, interval);
    }

    /**
     * @notice Removes an employee from the payroll
     * @dev Remaining accrued salary can still be claimed before removal
     * @param account Employee address to remove
     */
    function removeEmployee(address account) external onlyRole(EMPLOYER_ROLE) {
        require(employees[account].exists, "Not an employee");
        
        totalCommitment -= employees[account].salary;
        employeeCount--;
        
        delete employees[account];
        emit EmployeeRemoved(account);
    }

    /**
     * @notice Updates an employee's salary
     * @param account Employee address
     * @param newSalary New salary amount per interval
     */
    function updateSalary(address account, uint256 newSalary) external onlyRole(EMPLOYER_ROLE) {
        require(employees[account].exists, "Not an employee");
        require(newSalary > 0, "Invalid salary");
        
        uint256 oldSalary = employees[account].salary;
        totalCommitment = totalCommitment - oldSalary + newSalary;
        employees[account].salary = newSalary;
        
        emit SalaryUpdated(account, oldSalary, newSalary);
    }

    /**
     * @notice Updates an employee's pay interval
     * @param account Employee address
     * @param newInterval New interval in seconds
     */
    function updateInterval(address account, uint256 newInterval) external onlyRole(EMPLOYER_ROLE) {
        require(employees[account].exists, "Not an employee");
        require(newInterval > 0, "Invalid interval");
        
        uint256 oldInterval = employees[account].interval;
        employees[account].interval = newInterval;
        
        emit IntervalUpdated(account, oldInterval, newInterval);
    }

    /**
     * @notice Deposit tokens to fund the payroll
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external onlyRole(EMPLOYER_ROLE) {
        require(amount > 0, "No deposit");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit FundsDeposited(msg.sender, amount);
    }

    /**
     * @notice Emergency withdrawal of excess funds (only admin)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(token.transfer(to, amount), "Transfer failed");
        emit FundsWithdrawn(to, amount);
    }

    /**
     * @notice Employee claims their accrued salary
     */
    function claim() external nonReentrant {
        Employee storage e = employees[msg.sender];
        require(e.exists, "Not an employee");
        
        uint256 owed = _accrued(msg.sender);
        require(owed > 0, "Nothing owed yet");
        
        e.lastPaid = block.timestamp;
        require(token.transfer(msg.sender, owed), "Payment failed");
        
        emit Paid(msg.sender, owed);
    }

    /**
     * @notice Get accrued salary for an employee
     * @param account Employee address
     * @return The accrued amount
     */
    function getAccrued(address account) external view returns (uint256) {
        return _accrued(account);
    }

    /**
     * @notice Get employee details
     * @param account Employee address
     * @return salary The salary per interval
     * @return interval The pay interval in seconds
     * @return lastPaid Last payment timestamp
     * @return accrued Currently accrued amount
     */
    function getEmployeeInfo(address account) external view returns (
        uint256 salary,
        uint256 interval,
        uint256 lastPaid,
        uint256 accrued
    ) {
        Employee storage e = employees[account];
        if (!e.exists) {
            return (0, 0, 0, 0);
        }
        return (e.salary, e.interval, e.lastPaid, _accrued(account));
    }

    /**
     * @notice Get payroll contract balance
     * @return The token balance
     */
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev Calculate accrued salary pro-rata based on elapsed time
     * @param account Employee address
     * @return Accrued amount
     */
    function _accrued(address account) internal view returns (uint256) {
        Employee storage e = employees[account];
        if (!e.exists) return 0;
        
        uint256 elapsed = block.timestamp - e.lastPaid;
        // Pro-rata calculation: salary * elapsed / interval
        return (e.salary * elapsed) / e.interval;
    }
}
