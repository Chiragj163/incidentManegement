import { useEffect, useState } from "react";

import {
    getAuditLogs,
    getUsers,
} from "../services/api";

import type {
    AuditLog,
    User,
} from "../services/api";

import "./AuditLogs.css";

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const [action, setAction] = useState("");
    const [entityType, setEntityType] = useState("");
    const [userId, setUserId] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedLog, setSelectedLog] =
        useState<AuditLog | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const [logData, userData] =
                await Promise.all([
                    getAuditLogs(),
                    getUsers(),
                ]);

            setLogs(logData);
            setUsers(userData);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load audit logs"
            );
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getAuditLogs({
                action: action || undefined,
                entityType:
                    entityType || undefined,
                userId: userId
                    ? Number(userId)
                    : undefined,
                fromDate:
                    fromDate || undefined,
                toDate:
                    toDate || undefined,
            });

            setLogs(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load audit logs"
            );
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = async () => {
        setAction("");
        setEntityType("");
        setUserId("");
        setFromDate("");
        setToDate("");

        try {
            setLoading(true);

            const data = await getAuditLogs();

            setLogs(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to reset filters"
            );
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (value: string) => {
        return new Date(value).toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
        );
    };

    const formatAction = (value: string) => {
        return value
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    };

    const formatFieldName = (key: string) => {
        return key
            .replace(/_/g, " ")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    };

    const formatFieldValue = (value: unknown) => {
        if (value === null || value === undefined) {
            return "-";
        }

        if (typeof value === "boolean") {
            return value ? "Yes" : "No";
        }

        if (
            typeof value === "object"
        ) {
            return JSON.stringify(value);
        }

        return String(value);
    };

    const getAuditFields = (
        value: Record<string, unknown> | null
    ) => {
        if (!value) {
            return [];
        }

        const hiddenFields = [
            "id",
            "created_at",
            "updated_at",
            "password_hash",
        ];

        return Object.entries(value).filter(
            ([key]) => !hiddenFields.includes(key)
        );
    };
    const renderAuditData = (
        oldData: Record<string, unknown> | null,
        newData: Record<string, unknown> | null
    ) => {
        const oldFields = getAuditFields(oldData);
        const newFields = getAuditFields(newData);

        const fieldNames = Array.from(
            new Set([
                ...oldFields.map(([key]) => key),
                ...newFields.map(([key]) => key),
            ])
        );

        if (fieldNames.length === 0) {
            return (
                <div className="audit-no-data">
                    No additional data available.
                </div>
            );
        }

        const oldMap = Object.fromEntries(oldFields);
        const newMap = Object.fromEntries(newFields);

        const isCreate =
            !oldData && !!newData;

        const isDelete =
            !!oldData && !newData;

        if (isCreate) {
            return (
                <div className="audit-readable-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Value</th>
                            </tr>
                        </thead>

                        <tbody>
                            {fieldNames.map((field) => (
                                <tr key={field}>
                                    <td>
                                        {formatFieldName(field)}
                                    </td>

                                    <td>
                                        {formatFieldValue(
                                            newMap[field]
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (isDelete) {
            return (
                <div className="audit-readable-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Deleted Value</th>
                            </tr>
                        </thead>

                        <tbody>
                            {fieldNames.map((field) => (
                                <tr key={field}>
                                    <td>
                                        {formatFieldName(field)}
                                    </td>

                                    <td>
                                        {formatFieldValue(
                                            oldMap[field]
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

    return (
        <div className="audit-readable-table">
            <table>
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Previous Value</th>
                        <th>New Value</th>
                    </tr>
                </thead>

                <tbody>
                    {fieldNames.map((field) => {
                        const oldValue =
                            formatFieldValue(
                                oldMap[field]
                            );

                        const newValue =
                            formatFieldValue(
                                newMap[field]
                            );

                        const changed =
                            oldValue !== newValue;

                        return (
                            <tr
                                key={field}
                                className={
                                    changed
                                        ? "audit-field-changed"
                                        : ""
                                }
                            >
                                <td>
                                    {formatFieldName(
                                        field
                                    )}
                                </td>

                                <td>
                                    {oldValue}
                                </td>

                                <td>
                                    {newValue}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

    return (
        <div className="audit-page">

            <div className="audit-header">
                <div>
                    <h1>Audit Logs</h1>

                    <p>
                        Track important actions performed
                        across the Incident Management
                        system.
                    </p>
                </div>

                <div className="audit-total">
                    {logs.length} records
                </div>
            </div>

            {error && (
                <div className="audit-error">
                    {error}
                </div>
            )}

            {/* FILTERS */}

            <section className="audit-card">

                <div className="audit-section-title">
                    <h2>Filters</h2>
                </div>

                <div className="audit-filter-grid">

                    <div className="audit-form-group">
                        <label>Action</label>

                        <select
                            value={action}
                            onChange={(e) =>
                                setAction(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">All Actions</option>

                            <option value="CREATE_INCIDENT">Create Incident</option>
                            <option value="ASSIGN_INCIDENT">Assign Incident</option>
                            <option value="START_INCIDENT_WORK">Start Incident Work</option>
                            <option value="COMPLETE_INCIDENT">Complete Incident</option>
                            <option value="APPROVE_INCIDENT">Approve Incident</option>
                            <option value="REOPEN_INCIDENT">Reopen Incident</option>

                            <option value="CREATE_SITE">Create Site</option>
                            <option value="UPDATE_SITE">Update Site</option>
                            <option value="ACTIVATE_SITE">Activate Site</option>
                            <option value="DEACTIVATE_SITE">Deactivate Site</option>

                            <option value="CREATE_DEPARTMENT">Create Department</option>
                            <option value="UPDATE_DEPARTMENT">Update Department</option>
                            <option value="ACTIVATE_DEPARTMENT">Activate Department</option>
                            <option value="DEACTIVATE_DEPARTMENT">Deactivate Department</option>

                            <option value="CREATE_SUB_DEPARTMENT">
                                Create Sub Department
                            </option>
                            <option value="UPDATE_SUB_DEPARTMENT">
                                Update Sub Department
                            </option>
                            <option value="ACTIVATE_SUB_DEPARTMENT">
                                Activate Sub Department
                            </option>
                            <option value="DEACTIVATE_SUB_DEPARTMENT">
                                Deactivate Sub Department
                            </option>

                            <option value="CREATE_USER">Create User</option>
                            <option value="UPDATE_USER">Update User</option>
                            <option value="ACTIVATE_USER">Activate User</option>
                            <option value="DEACTIVATE_USER">Deactivate User</option>
                        </select>
                    </div>

                    <div className="audit-form-group">
                        <label>Entity Type</label>

                        <select
                            value={entityType}
                            onChange={(e) =>
                                setEntityType(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                All Entities
                            </option>

                            <option value="INCIDENT">
                                Incident
                            </option>

                            <option value="USER">
                                User
                            </option>

                            <option value="SITE">
                                Site
                            </option>

                            <option value="DEPARTMENT">
                                Department
                            </option>

                            <option value="SUB_DEPARTMENT">
                                Sub Department
                            </option>
                        </select>
                    </div>

                    <div className="audit-form-group">
                        <label>User</label>

                        <select
                            value={userId}
                            onChange={(e) =>
                                setUserId(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                All Users
                            </option>

                            {users.map((user) => (
                                <option
                                    key={user.id}
                                    value={user.id}
                                >
                                    {user.fullName} (
                                    {user.userId})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="audit-form-group">
                        <label>From Date</label>

                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) =>
                                setFromDate(
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="audit-form-group">
                        <label>To Date</label>

                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) =>
                                setToDate(
                                    e.target.value
                                )
                            }
                        />
                    </div>

                </div>

                <div className="audit-filter-actions">

                    <button
                        type="button"
                        className="audit-primary-button"
                        onClick={generateReport}
                        disabled={loading}
                    >
                        {loading
                            ? "Loading..."
                            : "Apply Filters"}
                    </button>

                    <button
                        type="button"
                        className="audit-secondary-button"
                        onClick={resetFilters}
                        disabled={loading}
                    >
                        Reset
                    </button>

                </div>

            </section>

            {/* TABLE */}

            <section className="audit-card">

                <div className="audit-table-header">
                    <div>
                        <h2>Activity History</h2>

                        <p>
                            Showing the latest 500 audit
                            records.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="audit-empty">
                        Loading audit logs...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="audit-empty">
                        No audit records found.
                    </div>
                ) : (
                    <div className="audit-table-wrapper">

                        <table className="audit-table">

                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Incident</th>
                                    <th>IP Address</th>
                                    <th>Details</th>
                                </tr>
                            </thead>

                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id}>

                                        <td className="audit-date">
                                            {formatDate(
                                                log.created_at
                                            )}
                                        </td>

                                        <td>
                                            <div className="audit-user">
                                                <strong>
                                                    {log.user_name ||
                                                        "System"}
                                                </strong>

                                                {log.user_code && (
                                                    <span>
                                                        {
                                                            log.user_code
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            <span className="audit-action">
                                                {formatAction(
                                                    log.action
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="audit-entity">
                                                {log.entity_type ||
                                                    "-"}
                                            </span>

                                            {log.entity_id && (
                                                <small>
                                                    #
                                                    {
                                                        log.entity_id
                                                    }
                                                </small>
                                            )}
                                        </td>

                                        <td>
                                            {log.incident_no ||
                                                "-"}
                                        </td>

                                        <td>
                                            {log.ip_address ||
                                                "-"}
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="view-audit-button"
                                                onClick={() =>
                                                    setSelectedLog(
                                                        log
                                                    )
                                                }
                                            >
                                                View
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>
                )}

            </section>

            {/* DETAIL MODAL */}

            {selectedLog && (
                <div
                    className="audit-modal-overlay"
                    onClick={() =>
                        setSelectedLog(null)
                    }
                >
                    <div
                        className="audit-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <div className="audit-modal-header">

                            <div>
                                <h2>
                                    Audit Details
                                </h2>

                                <p>
                                    {
                                        selectedLog.action
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                className="audit-close-button"
                                onClick={() =>
                                    setSelectedLog(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="audit-detail-grid">

                            <div>
                                <label>
                                    Date & Time
                                </label>

                                <span>
                                    {formatDate(
                                        selectedLog.created_at
                                    )}
                                </span>
                            </div>

                            <div>
                                <label>
                                    User
                                </label>

                                <span>
                                    {selectedLog.user_name ||
                                        "System"}
                                    {selectedLog.user_code
                                        ? ` (${selectedLog.user_code})`
                                        : ""}
                                </span>
                            </div>

                            <div>
                                <label>
                                    Action
                                </label>

                                <span>
                                    {formatAction(
                                        selectedLog.action
                                    )}
                                </span>
                            </div>

                            <div>
                                <label>
                                    Entity
                                </label>

                                <span>
                                    {selectedLog.entity_type ||
                                        "-"}
                                    {selectedLog.entity_id
                                        ? ` #${selectedLog.entity_id}`
                                        : ""}
                                </span>
                            </div>

                            <div>
                                <label>
                                    Incident
                                </label>

                                <span>
                                    {selectedLog.incident_no ||
                                        "-"}
                                </span>
                            </div>

                            <div>
                                <label>
                                    IP Address
                                </label>

                                <span>
                                    {selectedLog.ip_address ||
                                        "-"}
                                </span>
                            </div>

                        </div>

                        <div className="audit-readable-section">

                            <div className="audit-readable-header">
                                <h3>
                                    Change Details
                                </h3>

                                <span>
                                    {formatAction(selectedLog.action)}
                                </span>
                            </div>

                            {renderAuditData(
                                selectedLog.old_data,
                                selectedLog.new_data
                            )}

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default AuditLogs;
