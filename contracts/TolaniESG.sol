// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TolaniESG
 * @notice Contract for registering projects and tracking ESG metrics
 * @dev Project managers can create projects and add metrics. Reporters can update
 *      metric values. Useful for sustainability tracking, carbon credits, and
 *      impact reporting in the Tolani ecosystem.
 */
contract TolaniESG is AccessControl {
    bytes32 public constant PROJECT_MANAGER_ROLE = keccak256("PROJECT_MANAGER_ROLE");
    bytes32 public constant METRIC_REPORTER_ROLE = keccak256("METRIC_REPORTER_ROLE");

    enum Category { Environmental, Social, Governance }

    struct Metric {
        string metricId;
        string description;
        Category category;
        uint256 target;
        uint256 current;
        uint256 lastUpdated;
        string unit;          // e.g., "tCO2e", "kWh", "count"
    }

    struct Project {
        string projectId;
        string name;
        string description;
        bool active;
        uint256 createdAt;
        bytes32[] metricKeys;
    }

    // Project hash -> Project details
    mapping(bytes32 => Project) public projects;
    
    // Metric hash -> Metric details
    mapping(bytes32 => Metric) public metrics;
    
    // Project hash -> Metric hash -> exists
    mapping(bytes32 => mapping(bytes32 => bool)) public projectMetrics;
    
    // List of all project keys
    bytes32[] public projectKeys;

    event ProjectRegistered(string indexed projectId, string name);
    event ProjectDeactivated(string indexed projectId);
    event ProjectReactivated(string indexed projectId);
    event MetricAdded(string indexed projectId, string indexed metricId, Category category, uint256 target);
    event MetricReported(string indexed projectId, string indexed metricId, uint256 oldValue, uint256 newValue);
    event MetricTargetUpdated(string indexed projectId, string indexed metricId, uint256 oldTarget, uint256 newTarget);

    /**
     * @param admin The admin address (typically DAO timelock)
     */
    constructor(address admin) {
        require(admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PROJECT_MANAGER_ROLE, admin);
        _grantRole(METRIC_REPORTER_ROLE, admin);
    }

    /**
     * @notice Register a new ESG project
     * @param projectId Unique identifier for the project
     * @param name Human-readable project name
     * @param description Project description
     */
    function registerProject(
        string calldata projectId,
        string calldata name,
        string calldata description
    ) external onlyRole(PROJECT_MANAGER_ROLE) {
        bytes32 key = keccak256(abi.encodePacked(projectId));
        require(bytes(projects[key].projectId).length == 0, "Project exists");
        
        projects[key].projectId = projectId;
        projects[key].name = name;
        projects[key].description = description;
        projects[key].active = true;
        projects[key].createdAt = block.timestamp;
        
        projectKeys.push(key);
        
        emit ProjectRegistered(projectId, name);
    }

    /**
     * @notice Deactivate a project
     * @param projectId The project identifier
     */
    function deactivateProject(string calldata projectId) external onlyRole(PROJECT_MANAGER_ROLE) {
        bytes32 key = keccak256(abi.encodePacked(projectId));
        require(projects[key].active, "Project not active");
        
        projects[key].active = false;
        emit ProjectDeactivated(projectId);
    }

    /**
     * @notice Reactivate a project
     * @param projectId The project identifier
     */
    function reactivateProject(string calldata projectId) external onlyRole(PROJECT_MANAGER_ROLE) {
        bytes32 key = keccak256(abi.encodePacked(projectId));
        require(bytes(projects[key].projectId).length > 0, "Project not found");
        require(!projects[key].active, "Project already active");
        
        projects[key].active = true;
        emit ProjectReactivated(projectId);
    }

    /**
     * @notice Add a new metric to a project
     * @param projectId The project identifier
     * @param metricId Unique metric identifier
     * @param description What the metric measures
     * @param category Environmental, Social, or Governance
     * @param target Target value to achieve
     * @param unit Unit of measurement (e.g., "tCO2e", "kWh")
     */
    function addMetric(
        string calldata projectId,
        string calldata metricId,
        string calldata description,
        Category category,
        uint256 target,
        string calldata unit
    ) external onlyRole(PROJECT_MANAGER_ROLE) {
        bytes32 pKey = keccak256(abi.encodePacked(projectId));
        bytes32 mKey = keccak256(abi.encodePacked(metricId));
        
        require(projects[pKey].active, "Project not active");
        require(bytes(metrics[mKey].metricId).length == 0, "Metric exists");
        
        metrics[mKey] = Metric({
            metricId: metricId,
            description: description,
            category: category,
            target: target,
            current: 0,
            lastUpdated: block.timestamp,
            unit: unit
        });
        
        projects[pKey].metricKeys.push(mKey);
        projectMetrics[pKey][mKey] = true;
        
        emit MetricAdded(projectId, metricId, category, target);
    }

    /**
     * @notice Report a new value for a metric
     * @param projectId The project identifier
     * @param metricId The metric identifier
     * @param newValue The new value to record
     */
    function reportMetric(
        string calldata projectId,
        string calldata metricId,
        uint256 newValue
    ) external onlyRole(METRIC_REPORTER_ROLE) {
        bytes32 pKey = keccak256(abi.encodePacked(projectId));
        bytes32 mKey = keccak256(abi.encodePacked(metricId));
        
        require(projects[pKey].active, "Project not active");
        require(projectMetrics[pKey][mKey], "Metric not in project");
        
        uint256 oldValue = metrics[mKey].current;
        metrics[mKey].current = newValue;
        metrics[mKey].lastUpdated = block.timestamp;
        
        emit MetricReported(projectId, metricId, oldValue, newValue);
    }

    /**
     * @notice Update a metric's target
     * @param projectId The project identifier
     * @param metricId The metric identifier
     * @param newTarget The new target value
     */
    function updateMetricTarget(
        string calldata projectId,
        string calldata metricId,
        uint256 newTarget
    ) external onlyRole(PROJECT_MANAGER_ROLE) {
        bytes32 pKey = keccak256(abi.encodePacked(projectId));
        bytes32 mKey = keccak256(abi.encodePacked(metricId));
        
        require(projectMetrics[pKey][mKey], "Metric not in project");
        
        uint256 oldTarget = metrics[mKey].target;
        metrics[mKey].target = newTarget;
        
        emit MetricTargetUpdated(projectId, metricId, oldTarget, newTarget);
    }

    /**
     * @notice Get all metrics for a project
     * @param projectId The project identifier
     * @return Array of metrics
     */
    function getProjectMetrics(string calldata projectId) external view returns (Metric[] memory) {
        bytes32 pKey = keccak256(abi.encodePacked(projectId));
        bytes32[] storage mKeys = projects[pKey].metricKeys;
        
        Metric[] memory result = new Metric[](mKeys.length);
        for (uint256 i = 0; i < mKeys.length; i++) {
            result[i] = metrics[mKeys[i]];
        }
        return result;
    }

    /**
     * @notice Get project summary including ESG scores
     * @param projectId The project identifier
     * @return name Project name
     * @return active Is project active
     * @return totalMetrics Number of metrics
     * @return metricsOnTarget Number of metrics meeting target
     * @return avgProgress Average progress across all metrics (0-100)
     */
    function getProjectSummary(string calldata projectId) external view returns (
        string memory name,
        bool active,
        uint256 totalMetrics,
        uint256 metricsOnTarget,
        uint256 avgProgress
    ) {
        bytes32 pKey = keccak256(abi.encodePacked(projectId));
        Project storage p = projects[pKey];
        
        name = p.name;
        active = p.active;
        totalMetrics = p.metricKeys.length;
        
        if (totalMetrics == 0) {
            return (name, active, 0, 0, 0);
        }
        
        uint256 totalProgress = 0;
        for (uint256 i = 0; i < totalMetrics; i++) {
            Metric storage m = metrics[p.metricKeys[i]];
            if (m.target > 0) {
                uint256 progress = (m.current * 100) / m.target;
                if (progress > 100) progress = 100;
                totalProgress += progress;
                
                if (m.current >= m.target) {
                    metricsOnTarget++;
                }
            }
        }
        
        avgProgress = totalProgress / totalMetrics;
    }

    /**
     * @notice Get the number of registered projects
     * @return Number of projects
     */
    function getProjectCount() external view returns (uint256) {
        return projectKeys.length;
    }

    /**
     * @notice Get project info by index
     * @param index The project index
     * @return projectId The project identifier
     * @return name The project name
     * @return active Whether the project is active
     */
    function getProjectByIndex(uint256 index) external view returns (
        string memory projectId,
        string memory name,
        bool active
    ) {
        require(index < projectKeys.length, "Index out of bounds");
        Project storage p = projects[projectKeys[index]];
        return (p.projectId, p.name, p.active);
    }
}
