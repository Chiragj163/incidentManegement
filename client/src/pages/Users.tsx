import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
    createUser,
    getDepartments,
    getSites,
    getSubDepartments,
    getUsers,
    getCurrentUser,
    updateUser,
    updateUserStatus,
} from "../services/api";

import type {
    CreateUserRequest,
    Department,
    Site,
    SubDepartment,
    User,
} from "../services/api";


interface UserForm {
    userId: string;
    employeeCode: string;
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    roleCode: string;
    siteId: string;
    departmentId: string;
    subDepartmentId: string;
    designation: string;
}


const emptyForm: UserForm = {
    userId: "",
    employeeCode: "",
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    roleCode: "USER",
    siteId: "",
    departmentId: "",
    subDepartmentId: "",
    designation: "",
};


export default function Users() {

    const [users, setUsers] =
        useState<User[]>([]);

    const [sites, setSites] =
        useState<Site[]>([]);

    const [departments, setDepartments] =
        useState<Department[]>([]);

    const [subDepartments, setSubDepartments] =
        useState<SubDepartment[]>([]);

    const [currentUser, setCurrentUser] =
        useState<any>(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [siteFilter, setSiteFilter] =
        useState("");

    const [departmentFilter, setDepartmentFilter] =
        useState("");

    const [subDepartmentFilter, setSubDepartmentFilter] =
        useState("");

    const [roleFilter, setRoleFilter] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("");

    const [showModal, setShowModal] =
        useState(false);

    const [editingUser, setEditingUser] =
        useState<User | null>(null);

    const [form, setForm] =
        useState<UserForm>(emptyForm);


    const isSuperAdmin =
        currentUser?.role ===
        "SUPER_ADMIN";

    const isDepartmentAdmin =
        currentUser?.role ===
        "DEPARTMENT_ADMIN";


    const loadData = async () => {

        try {

            setLoading(true);
            setError("");

            const [
                userData,
                siteData,
                departmentData,
                subDepartmentData,
            ] = await Promise.all([
                getUsers(),
                getSites(),
                getDepartments(),
                getSubDepartments(),
            ]);

            setUsers(userData);
            setSites(siteData);
            setDepartments(
                departmentData
            );
            setSubDepartments(
                subDepartmentData
            );

        } catch (err) {

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load users"
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {

        const user =
            getCurrentUser();

        setCurrentUser(user);

        loadData();

    }, []);


    const filteredDepartments =
        useMemo(() => {

            if (!siteFilter) {
                return departments;
            }

            return departments.filter(
                (department) =>
                    String(
                        department.site_id
                    ) === siteFilter
            );

        }, [
            departments,
            siteFilter,
        ]);


    const filteredSubDepartments =
        useMemo(() => {

            if (!departmentFilter) {
                return subDepartments;
            }

            return subDepartments.filter(
                (subDepartment) =>
                    String(
                        subDepartment.department_id
                    ) ===
                    departmentFilter
            );

        }, [
            subDepartments,
            departmentFilter,
        ]);


    const formDepartments =
        useMemo(() => {

            if (!form.siteId) {
                return [];
            }

            return departments.filter(
                (department) =>
                    String(
                        department.site_id
                    ) === form.siteId &&
                    department.status ===
                        "ACTIVE"
            );

        }, [
            departments,
            form.siteId,
        ]);


    const formSubDepartments =
        useMemo(() => {

            if (!form.departmentId) {
                return [];
            }

            return subDepartments.filter(
                (subDepartment) =>
                    String(
                        subDepartment.department_id
                    ) ===
                        form.departmentId &&
                    subDepartment.status ===
                        "ACTIVE"
            );

        }, [
            subDepartments,
            form.departmentId,
        ]);


    const filteredUsers =
        useMemo(() => {

            const text =
                search
                    .trim()
                    .toLowerCase();

            return users.filter(
                (user) => {

                    const matchesSearch =
                        !text ||
                        user.userId
                            .toLowerCase()
                            .includes(text) ||
                        user.employeeCode
                            .toLowerCase()
                            .includes(text) ||
                        user.fullName
                            .toLowerCase()
                            .includes(text) ||
                        (
                            user.email ||
                            ""
                        )
                            .toLowerCase()
                            .includes(text);


                    const matchesSite =
                        !siteFilter ||
                        String(
                            user.siteId
                        ) === siteFilter;


                    const matchesDepartment =
                        !departmentFilter ||
                        String(
                            user.departmentId
                        ) ===
                            departmentFilter;


                    const matchesSubDepartment =
                        !subDepartmentFilter ||
                        String(
                            user.subDepartmentId
                        ) ===
                            subDepartmentFilter;


                    const matchesRole =
                        !roleFilter ||
                        user.role ===
                            roleFilter;


                    const matchesStatus =
                        !statusFilter ||
                        user.status ===
                            statusFilter;


                    return (
                        matchesSearch &&
                        matchesSite &&
                        matchesDepartment &&
                        matchesSubDepartment &&
                        matchesRole &&
                        matchesStatus
                    );
                }
            );

        }, [
            users,
            search,
            siteFilter,
            departmentFilter,
            subDepartmentFilter,
            roleFilter,
            statusFilter,
        ]);


    const openAddModal = () => {

        setEditingUser(null);

        setForm({
            ...emptyForm,
            roleCode:
                isDepartmentAdmin
                    ? "USER"
                    : "USER",
        });

        setError("");
        setSuccess("");

        setShowModal(true);
    };


    const openEditModal = (
        user: User
    ) => {

        setEditingUser(user);

        setForm({
            userId:
                user.userId,

            employeeCode:
                user.employeeCode,

            fullName:
                user.fullName,

            email:
                user.email || "",

            mobile:
                user.mobile || "",

            password: "",

            roleCode:
                user.role,

            siteId:
                user.siteId !== null
                    ? String(user.siteId)
                    : "",

            departmentId:
                user.departmentId !== null
                    ? String(
                        user.departmentId
                    )
                    : "",

            subDepartmentId:
                user.subDepartmentId !==
                null
                    ? String(
                        user.subDepartmentId
                    )
                    : "",

            designation:
                user.designation || "",
        });

        setError("");
        setSuccess("");

        setShowModal(true);
    };


    const closeModal = () => {

        if (saving) {
            return;
        }

        setShowModal(false);

        setEditingUser(null);

        setForm(emptyForm);
    };


    const handleChange = (
        event: ChangeEvent<
            HTMLInputElement |
            HTMLSelectElement
        >
    ) => {

        const {
            name,
            value,
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };


    const handleSiteChange = (
        event: ChangeEvent<HTMLSelectElement>
    ) => {

        setForm((previous) => ({
            ...previous,
            siteId:
                event.target.value,
            departmentId: "",
            subDepartmentId: "",
        }));
    };


    const handleDepartmentChange = (
        event: ChangeEvent<HTMLSelectElement>
    ) => {

        setForm((previous) => ({
            ...previous,
            departmentId:
                event.target.value,
            subDepartmentId: "",
        }));
    };


    const handleFilterSiteChange = (
        event: ChangeEvent<HTMLSelectElement>
    ) => {

        setSiteFilter(
            event.target.value
        );

        setDepartmentFilter("");

        setSubDepartmentFilter("");
    };


    const handleFilterDepartmentChange = (
        event: ChangeEvent<HTMLSelectElement>
    ) => {

        setDepartmentFilter(
            event.target.value
        );

        setSubDepartmentFilter("");
    };


    const handleSubmit = async (
        event: FormEvent
    ) => {

        event.preventDefault();

        setError("");
        setSuccess("");


        if (!form.userId.trim()) {

            setError(
                "SAP/User ID is required."
            );

            return;
        }


        if (!form.fullName.trim()) {

            setError(
                "Full name is required."
            );

            return;
        }


        if (!editingUser &&
            !form.password.trim()) {

            setError(
                "Password is required."
            );

            return;
        }


        if (!form.roleCode) {

            setError(
                "Role is required."
            );

            return;
        }


        if (!form.siteId) {

            setError(
                "Site is required."
            );

            return;
        }


        if (
            (
                form.roleCode ===
                    "USER" ||
                form.roleCode ===
                    "DEPARTMENT_ADMIN"
            ) &&
            !form.departmentId
        ) {

            setError(
                "Department is required for this role."
            );

            return;
        }


        if (
            form.roleCode ===
                "USER" &&
            !form.subDepartmentId
        ) {

            setError(
                "Sub-department is required for a normal user."
            );

            return;
        }


        try {

            setSaving(true);


            const payload:
                CreateUserRequest = {

                userId:
                    form.userId.trim(),

                employeeCode:
                    form.employeeCode.trim(),

                fullName:
                    form.fullName.trim(),

                email:
                    form.email.trim(),

                mobile:
                    form.mobile.trim(),

                roleCode:
                    form.roleCode,

                siteId:
                    Number(form.siteId),

                departmentId:
                    form.departmentId
                        ? Number(
                            form.departmentId
                        )
                        : null,

                subDepartmentId:
                    form.subDepartmentId
                        ? Number(
                            form.subDepartmentId
                        )
                        : null,

                designation:
                    form.designation.trim(),
            };


            if (!editingUser) {

                payload.password =
                    form.password;

                await createUser(
                    payload
                );

                setSuccess(
                    "User created successfully."
                );

            } else {

                await updateUser(
                    editingUser.id,
                    payload
                );

                setSuccess(
                    "User updated successfully."
                );
            }


            setShowModal(false);

            setEditingUser(null);

            setForm(emptyForm);

            await loadData();

        } catch (err) {

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to save user"
            );

        } finally {

            setSaving(false);
        }
    };


    const toggleStatus = async (
        user: User
    ) => {

        if (
            currentUser &&
            user.id === currentUser.id
        ) {

            setError(
                "You cannot deactivate your own account."
            );

            return;
        }


        const newStatus =
            user.status === "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE";


        const confirmed =
            window.confirm(
                `Are you sure you want to mark "${user.fullName}" as ${newStatus}?`
            );


        if (!confirmed) {
            return;
        }


        try {

            setError("");
            setSuccess("");

            await updateUserStatus(
                user.id,
                newStatus
            );

            setSuccess(
                `User marked ${newStatus}.`
            );

            await loadData();

        } catch (err) {

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to update user status"
            );
        }
    };


    return (
        <div className="departments-page">

            <div className="page-header">

                <div>

                    <h1>
                        Users
                    </h1>

                    <p>
                        Manage employee accounts
                        and access hierarchy
                    </p>

                </div>


                <button
                    className="primary-button"
                    onClick={openAddModal}
                >
                    + Add User
                </button>

            </div>


            {error && (
                <div className="alert error">
                    {error}
                </div>
            )}


            {success && (
                <div className="alert success">
                    {success}
                </div>
            )}


            <div className="filter-bar">

                <input
                    type="text"
                    placeholder="Search SAP ID, name, employee code..."
                    value={search}
                    onChange={(event) =>
                        setSearch(
                            event.target.value
                        )
                    }
                />


                <select
                    value={siteFilter}
                    onChange={
                        handleFilterSiteChange
                    }
                >

                    <option value="">
                        All Sites
                    </option>

                    {sites.map(
                        (site) => (

                            <option
                                key={site.id}
                                value={site.id}
                            >
                                {
                                    site.site_name
                                }
                            </option>

                        )
                    )}

                </select>


                <select
                    value={departmentFilter}
                    onChange={
                        handleFilterDepartmentChange
                    }
                >

                    <option value="">
                        All Departments
                    </option>

                    {filteredDepartments.map(
                        (department) => (

                            <option
                                key={
                                    department.id
                                }
                                value={
                                    department.id
                                }
                            >
                                {
                                    department.department_name
                                }
                            </option>

                        )
                    )}

                </select>


                <select
                    value={subDepartmentFilter}
                    onChange={(event) =>
                        setSubDepartmentFilter(
                            event.target.value
                        )
                    }
                >

                    <option value="">
                        All Sub Departments
                    </option>

                    {filteredSubDepartments.map(
                        (subDepartment) => (

                            <option
                                key={
                                    subDepartment.id
                                }
                                value={
                                    subDepartment.id
                                }
                            >
                                {
                                    subDepartment.sub_department_name
                                }
                            </option>

                        )
                    )}

                </select>


                <select
                    value={roleFilter}
                    onChange={(event) =>
                        setRoleFilter(
                            event.target.value
                        )
                    }
                >

                    <option value="">
                        All Roles
                    </option>

                    <option value="SUPER_ADMIN">
                        Super Admin
                    </option>

                    <option value="DEPARTMENT_ADMIN">
                        Department Admin
                    </option>

                    <option value="USER">
                        User
                    </option>

                </select>


                <select
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(
                            event.target.value
                        )
                    }
                >

                    <option value="">
                        All Status
                    </option>

                    <option value="ACTIVE">
                        Active
                    </option>

                    <option value="INACTIVE">
                        Inactive
                    </option>

                </select>

            </div>


            <div className="table-card">

                {loading ? (

                    <div className="loading-state">
                        Loading users...
                    </div>

                ) : filteredUsers.length ===
                  0 ? (

                    <div className="empty-state">
                        No users found.
                    </div>

                ) : (

                    <div className="table-wrapper">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        #
                                    </th>

                                    <th>
                                        SAP ID
                                    </th>

                                    <th>
                                        Employee
                                    </th>

                                    <th>
                                        Site
                                    </th>

                                    <th>
                                        Department
                                    </th>

                                    <th>
                                        Sub Department
                                    </th>

                                    <th>
                                        Role
                                    </th>

                                    <th>
                                        Designation
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {filteredUsers.map(
                                    (
                                        user,
                                        index
                                    ) => (

                                        <tr
                                            key={
                                                user.id
                                            }
                                        >

                                            <td>
                                                {
                                                    index +
                                                    1
                                                }
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        user.userId
                                                    }
                                                </strong>
                                            </td>

                                            <td>

                                                <strong>
                                                    {
                                                        user.fullName
                                                    }
                                                </strong>

                                                <div>
                                                    {
                                                        user.email ||
                                                        "-"
                                                    }
                                                </div>

                                            </td>

                                            <td>
                                                {
                                                    user.siteName ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    user.departmentName ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    user.subDepartmentName ||
                                                    "-"
                                                }
                                            </td>

                                            <td>
                                                {
                                                    user.roleName ||
                                                    user.role
                                                }
                                            </td>

                                            <td>
                                                {
                                                    user.designation ||
                                                    "-"
                                                }
                                            </td>

                                            <td>

                                                <span
                                                    className={
                                                        user.status ===
                                                        "ACTIVE"
                                                            ? "status-badge active"
                                                            : "status-badge inactive"
                                                    }
                                                >
                                                    {
                                                        user.status
                                                    }
                                                </span>

                                            </td>

                                            <td>

                                                <div className="action-buttons">

                                                    <button
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            openEditModal(
                                                                user
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        className={
                                                            user.status ===
                                                            "ACTIVE"
                                                                ? "danger-button"
                                                                : "success-button"
                                                        }
                                                        onClick={() =>
                                                            toggleStatus(
                                                                user
                                                            )
                                                        }
                                                    >
                                                        {
                                                            user.status ===
                                                            "ACTIVE"
                                                                ? "Deactivate"
                                                                : "Activate"
                                                        }
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>


            {showModal && (

                <div
                    className="modal-overlay"
                    onClick={closeModal}
                >

                    <div
                        className="modal-card"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>

                                <h2>
                                    {
                                        editingUser
                                            ? "Edit User"
                                            : "Add User"
                                    }
                                </h2>

                                <p>
                                    Configure employee
                                    account and access.
                                </p>

                            </div>


                            <button
                                className="modal-close"
                                onClick={closeModal}
                            >
                                ×
                            </button>

                        </div>


                        <form
                            className="department-form"
                            onSubmit={handleSubmit}
                        >

                            <div className="form-grid">

                                <div className="form-group">

                                    <label>
                                        SAP / User ID *
                                    </label>

                                    <input
                                        type="text"
                                        name="userId"
                                        value={
                                            form.userId
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. 100105"
                                        required
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Employee Code
                                    </label>

                                    <input
                                        type="text"
                                        name="employeeCode"
                                        value={
                                            form.employeeCode
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Employee code"
                                    />

                                </div>

                            </div>


                            <div className="form-group">

                                <label>
                                    Full Name *
                                </label>

                                <input
                                    type="text"
                                    name="fullName"
                                    value={
                                        form.fullName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Employee full name"
                                    required
                                />

                            </div>


                            <div className="form-grid">

                                <div className="form-group">

                                    <label>
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={
                                            form.email
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="employee@example.com"
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Mobile
                                    </label>

                                    <input
                                        type="text"
                                        name="mobile"
                                        value={
                                            form.mobile
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Mobile number"
                                    />

                                </div>

                            </div>


                            {!editingUser && (

                                <div className="form-group">

                                    <label>
                                        Password *
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        value={
                                            form.password
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Initial password"
                                        required
                                    />

                                </div>

                            )}


                            <div className="form-group">

                                <label>
                                    Role *
                                </label>

                                <select
                                    name="roleCode"
                                    value={
                                        form.roleCode
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        isDepartmentAdmin
                                    }
                                    required
                                >

                                    {isSuperAdmin && (
                                        <>

                                            <option value="SUPER_ADMIN">
                                                Super Admin
                                            </option>

                                            <option value="DEPARTMENT_ADMIN">
                                                Department Admin
                                            </option>

                                        </>
                                    )}

                                    <option value="USER">
                                        User
                                    </option>

                                </select>

                                {isDepartmentAdmin && (
                                    <small>
                                        Department Admin
                                        can manage only
                                        normal users.
                                    </small>
                                )}

                            </div>


                            <div className="form-group">

                                <label>
                                    Site *
                                </label>

                                <select
                                    name="siteId"
                                    value={
                                        form.siteId
                                    }
                                    onChange={
                                        handleSiteChange
                                    }
                                    disabled={
                                        isDepartmentAdmin
                                    }
                                    required
                                >

                                    <option value="">
                                        Select Site
                                    </option>

                                    {sites
                                        .filter(
                                            (site) =>
                                                site.status ===
                                                "ACTIVE"
                                        )
                                        .map(
                                            (site) => (

                                                <option
                                                    key={
                                                        site.id
                                                    }
                                                    value={
                                                        site.id
                                                    }
                                                >
                                                    {
                                                        site.site_code
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        site.site_name
                                                    }
                                                </option>

                                            )
                                        )}

                                </select>

                            </div>


                            <div className="form-group">

                                <label>
                                    Department
                                    {
                                        (
                                            form.roleCode ===
                                                "USER" ||
                                            form.roleCode ===
                                                "DEPARTMENT_ADMIN"
                                        )
                                            ? " *"
                                            : ""
                                    }
                                </label>

                                <select
                                    name="departmentId"
                                    value={
                                        form.departmentId
                                    }
                                    onChange={
                                        handleDepartmentChange
                                    }
                                    disabled={
                                        !form.siteId ||
                                        isDepartmentAdmin
                                    }
                                    required={
                                        form.roleCode ===
                                            "USER" ||
                                        form.roleCode ===
                                            "DEPARTMENT_ADMIN"
                                    }
                                >

                                    <option value="">
                                        {
                                            form.siteId
                                                ? "Select Department"
                                                : "Select Site First"
                                        }
                                    </option>

                                    {formDepartments.map(
                                        (
                                            department
                                        ) => (

                                            <option
                                                key={
                                                    department.id
                                                }
                                                value={
                                                    department.id
                                                }
                                            >
                                                {
                                                    department.department_code
                                                }{" "}
                                                -{" "}
                                                {
                                                    department.department_name
                                                }
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {form.roleCode ===
                                "USER" && (

                                <div className="form-group">

                                    <label>
                                        Sub Department *
                                    </label>

                                    <select
                                        name="subDepartmentId"
                                        value={
                                            form.subDepartmentId
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={
                                            !form.departmentId ||
                                            isDepartmentAdmin
                                        }
                                        required
                                    >

                                        <option value="">
                                            {
                                                form.departmentId
                                                    ? "Select Sub Department"
                                                    : "Select Department First"
                                            }
                                        </option>

                                        {formSubDepartments.map(
                                            (
                                                subDepartment
                                            ) => (

                                                <option
                                                    key={
                                                        subDepartment.id
                                                    }
                                                    value={
                                                        subDepartment.id
                                                    }
                                                >
                                                    {
                                                        subDepartment.sub_department_code
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        subDepartment.sub_department_name
                                                    }
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>

                            )}


                            <div className="form-group">

                                <label>
                                    Designation
                                </label>

                                <input
                                    type="text"
                                    name="designation"
                                    value={
                                        form.designation
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. Network Engineer"
                                />

                            </div>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={
                                        saving
                                    }
                                >
                                    {
                                        saving
                                            ? "Saving..."
                                            : editingUser
                                                ? "Update User"
                                                : "Create User"
                                    }
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}