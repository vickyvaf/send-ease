// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title RemittanceContract
 * @notice On-chain scheduler and execution contract for recurring stablecoin transfers.
 */
contract RemittanceContract {
    IERC20 public immutable token;
    address public owner;
    address public agent;

    struct Schedule {
        uint256 id;
        address owner;
        address recipient;
        uint256 amount;
        uint256 frequency; // 0 = One-time, 1 = Weekly, 2 = Monthly
        uint256 startDate;
        uint256 nextExecutionTimestamp;
        bool hasMonthlyLimit;
        uint256 maxMonthlyAmount;
        uint256 currentMonthPaid;
        uint256 lastPaidMonthTimestamp;
        uint256 status; // 0 = Active, 1 = Paused, 2 = Cancelled, 3 = Completed
        string recipientName;
        string recipientPhone;
    }

    uint256 public scheduleCount;
    mapping(uint256 => Schedule) public schedules;

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed owner,
        address indexed recipient,
        uint256 amount,
        uint256 frequency,
        uint256 startDate
    );
    event PaymentExecuted(
        uint256 indexed scheduleId,
        address indexed owner,
        address indexed recipient,
        uint256 amount,
        uint256 nextExecutionTimestamp
    );
    event ScheduleStatusChanged(uint256 indexed scheduleId, uint256 indexed status);
    event ScheduleEdited(
        uint256 indexed scheduleId,
        uint256 amount,
        bool hasMonthlyLimit,
        uint256 maxMonthlyAmount
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AgentChanged(address indexed previousAgent, address indexed newAgent);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "Not agent");
        _;
    }

    modifier onlyScheduleOwner(uint256 scheduleId) {
        require(schedules[scheduleId].owner == msg.sender, "Not schedule owner");
        _;
    }

    constructor(address _token, address _agent) {
        require(_token != address(0), "Invalid token address");
        require(_agent != address(0), "Invalid agent address");
        token = IERC20(_token);
        owner = msg.sender;
        agent = _agent;
        emit OwnershipTransferred(address(0), msg.sender);
        emit AgentChanged(address(0), _agent);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "Invalid address");
        emit AgentChanged(agent, newAgent);
        agent = newAgent;
    }

    function createSchedule(
        address _recipient,
        string calldata _recipientName,
        string calldata _recipientPhone,
        uint256 _amount,
        uint256 _frequency,
        uint256 _startDate,
        bool _hasMonthlyLimit,
        uint256 _maxMonthlyAmount
    ) external returns (uint256) {
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != msg.sender, "Cannot send to yourself");
        require(_amount > 0, "Amount must be greater than zero");
        require(_frequency <= 2, "Invalid frequency");

        uint256 scheduleId = ++scheduleCount;

        schedules[scheduleId] = Schedule({
            id: scheduleId,
            owner: msg.sender,
            recipient: _recipient,
            amount: _amount,
            frequency: _frequency,
            startDate: _startDate,
            nextExecutionTimestamp: _startDate,
            hasMonthlyLimit: _hasMonthlyLimit,
            maxMonthlyAmount: _maxMonthlyAmount,
            currentMonthPaid: 0,
            lastPaidMonthTimestamp: _startDate,
            status: 0, // Active
            recipientName: _recipientName,
            recipientPhone: _recipientPhone
        });

        emit ScheduleCreated(scheduleId, msg.sender, _recipient, _amount, _frequency, _startDate);
        return scheduleId;
    }

    function editSchedule(
        uint256 _scheduleId,
        uint256 _newAmount,
        bool _newHasMonthlyLimit,
        uint256 _newMaxMonthlyAmount
    ) external onlyScheduleOwner(_scheduleId) {
        Schedule storage schedule = schedules[_scheduleId];
        require(schedule.status == 0 || schedule.status == 1, "Inactive schedule");
        require(_newAmount > 0, "Amount must be greater than zero");

        schedule.amount = _newAmount;
        schedule.hasMonthlyLimit = _newHasMonthlyLimit;
        schedule.maxMonthlyAmount = _newMaxMonthlyAmount;

        emit ScheduleEdited(_scheduleId, _newAmount, _newHasMonthlyLimit, _newMaxMonthlyAmount);
    }

    function pauseSchedule(uint256 _scheduleId) external onlyScheduleOwner(_scheduleId) {
        Schedule storage schedule = schedules[_scheduleId];
        require(schedule.status == 0, "Schedule is not active");
        schedule.status = 1; // Paused
        emit ScheduleStatusChanged(_scheduleId, 1);
    }

    function resumeSchedule(uint256 _scheduleId) external onlyScheduleOwner(_scheduleId) {
        Schedule storage schedule = schedules[_scheduleId];
        require(schedule.status == 1, "Schedule is not paused");
        schedule.status = 0; // Active
        emit ScheduleStatusChanged(_scheduleId, 0);
    }

    function cancelSchedule(uint256 _scheduleId) external onlyScheduleOwner(_scheduleId) {
        Schedule storage schedule = schedules[_scheduleId];
        require(schedule.status == 0 || schedule.status == 1, "Schedule already ended");
        schedule.status = 2; // Cancelled
        emit ScheduleStatusChanged(_scheduleId, 2);
    }

    function executeScheduledPayment(uint256 _scheduleId) external onlyAgent {
        Schedule storage schedule = schedules[_scheduleId];
        require(schedule.status == 0, "Schedule is not active");
        require(block.timestamp >= schedule.nextExecutionTimestamp, "Payment is not due yet");

        // Limit Enforcement
        if (schedule.hasMonthlyLimit) {
            // Reset monthly counter if 30 days have elapsed since last reset point
            if (block.timestamp >= schedule.lastPaidMonthTimestamp + 30 days) {
                schedule.currentMonthPaid = 0;
                schedule.lastPaidMonthTimestamp = block.timestamp;
            }
            require(schedule.currentMonthPaid + schedule.amount <= schedule.maxMonthlyAmount, "Exceeds monthly limit");
            schedule.currentMonthPaid += schedule.amount;
        }

        // Execute ERC20 Transfer
        require(
            token.transferFrom(schedule.owner, schedule.recipient, schedule.amount),
            "ERC20 transfer failed"
        );

        // Update schedule time logic
        if (schedule.frequency == 0) {
            // One-time payment
            schedule.status = 3; // Completed
            schedule.nextExecutionTimestamp = 0;
            emit ScheduleStatusChanged(_scheduleId, 3);
        } else if (schedule.frequency == 1) {
            // Weekly
            schedule.nextExecutionTimestamp += 7 days;
        } else if (schedule.frequency == 2) {
            // Monthly
            schedule.nextExecutionTimestamp += 30 days;
        }

        emit PaymentExecuted(
            _scheduleId,
            schedule.owner,
            schedule.recipient,
            schedule.amount,
            schedule.nextExecutionTimestamp
        );
    }

    function getSchedule(
        uint256 _scheduleId
    ) external view returns (Schedule memory) {
        return schedules[_scheduleId];
    }
}
