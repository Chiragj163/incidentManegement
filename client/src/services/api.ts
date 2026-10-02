const API_BASE_URL = "https://192.168.100.186:5000/api";

export interface LoginUser {
    id: string;
    userId: string;
    fullName: string;
    role: string;
    roleName: string;
    siteId: number | null;
    departmentId: number | null;
    subDepartmentId: number | null;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        user: LoginUser;
    };
}
export interface MyProfile {
    id: number;
    user_id: string;
    employee_code: string | null;
    full_name: string;
    email: string | null;
    mobile: string | null;
    designation: string | null;
    status: string;

    role_code: string;
    role_name: string;

    site_id: number | null;
    site_code: string | null;
    site_name: string | null;

    department_id: number | null;
    department_code: string | null;
    department_name: string | null;

    sub_department_id: number | null;
    sub_department_code: string | null;
    sub_department_name: string | null;
}
export const getMyProfile = async (): Promise<MyProfile> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/auth/me`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch profile"
        );
    }

    return data.data;
};


export const updateMyProfile = async (
    email: string,
    mobile: string
): Promise<MyProfile> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/auth/profile`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
                email,
                mobile,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to update profile"
        );
    }

    return data.data;
};


export const changeMyPassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
): Promise<void> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/auth/change-password`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword,
            }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to change password"
        );
    }
};
export interface DashboardIncident {
    id: number;
    incident_no: string;
    subject: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: string;

    from_site_id: number;
    to_site_id: number;

    from_department_id: number;
    to_department_id: number;

    from_site_name: string | null;
    to_site_name: string | null;

    from_department_name: string | null;
    to_department_name: string | null;

    reported_by: number;
    reported_by_name: string | null;

    assigned_to: number | null;
    assigned_to_name: string | null;

    created_at: string;
    updated_at: string;
}

export interface DashboardBoard {
    report: DashboardIncident[];
    assigned: DashboardIncident[];
    working: DashboardIncident[];
    review: DashboardIncident[];
    finished: DashboardIncident[];
}

export interface DashboardStats {
    total: number;
    reported: number;
    assigned: number;
    working: number;
    done_from_my_side: number;
    review: number;
    reopened: number;
    finished: number;
    cancelled: number;

    critical: number;
    high: number;
    medium: number;
    low: number;

    board: DashboardBoard;
}
export interface Incident {
    id: number;
    incident_no: string;

    site_id: number;

    from_site_id: number;
    to_site_id: number;

    site_code: string;
    site_name: string;

    from_department_id: number;
    from_department_code: string;
    from_department_name: string;

    from_sub_department_id: number | null;
    from_sub_department_code: string | null;
    from_sub_department_name: string | null;

    reported_by: number;
    reporter_user_id: string;
    reporter_name: string;
    reporter_designation: string | null;

    to_department_id: number;
    to_department_code: string;
    to_department_name: string;

    to_sub_department_id: number | null;
    to_sub_department_code: string | null;
    to_sub_department_name: string | null;

    assigned_to: number | null;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
    assigned_user_designation: string | null;

    subject: string;
    description: string;

    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

    status:
        | "REPORTED"
        | "ASSIGNED"
        | "WORKING"
        | "DONE_FROM_MY_SIDE"
        | "REVIEW"
        | "REOPENED"
        | "FINISHED"
        | "CANCELLED";

    created_at: string;
    updated_at: string;
    closed_at: string | null;
}
export interface IncidentListParams {
    status?: string;
    priority?: string;
    siteId?: string;
    departmentId?: string;
    search?: string;
}

export const login = async (
    userId: string,
    password: string
): Promise<LoginResponse> => {

    const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                userId,
                password,
            }),
        }
    );

    const data = await response.json();

    console.log("LOGIN API RESPONSE:", data);

    if (!response.ok || !data.success) {
        const error = new Error(
            data.message || "Login failed"
        ) as Error & {
            retryAfterSeconds?: number;
        };

        if (
            typeof data.retryAfterSeconds === "number"
        ) {
            error.retryAfterSeconds =
                data.retryAfterSeconds;
        }

        throw error;
    }

    return data as LoginResponse;
};

export const getToken = (): string | null => {
    return sessionStorage.getItem(
        "incident_token"
    );
};

export const getCurrentUser = (): LoginUser | null => {

    const user = sessionStorage.getItem(
        "incident_user"
    );

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user) as LoginUser;
    } catch {
        return null;
    }
};

export const logout = (): void => {

    sessionStorage.removeItem(
        "incident_token"
    );

    sessionStorage.removeItem(
        "incident_user"
    );
};
export type DashboardDateFilter =
    | "TODAY"
    | "THIS_WEEK"
    | "THIS_MONTH"
    | "CUSTOM";

export interface DashboardFilters {
    dateFilter?: DashboardDateFilter;
    fromDate?: string;
    toDate?: string;
}

export const getDashboardStats = async (
    filters?: DashboardFilters
): Promise<DashboardStats> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const params = new URLSearchParams();

    if (filters?.dateFilter) {
        params.append("dateFilter", filters.dateFilter);
    }

    if (
        filters?.dateFilter === "CUSTOM" &&
        filters.fromDate
    ) {
        params.append("fromDate", filters.fromDate);
    }

    if (
        filters?.dateFilter === "CUSTOM" &&
        filters.toDate
    ) {
        params.append("toDate", filters.toDate);
    }

    const queryString = params.toString();

    const response = await fetch(
        `${API_BASE_URL}/incidents/dashboard${
            queryString ? `?${queryString}` : ""
        }`,
        {
            method: "GET",

            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch dashboard statistics"
        );
    }

    return data.data;
};
export const getIncidents = async (
    params: IncidentListParams = {}
): Promise<Incident[]> => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const searchParams = new URLSearchParams();

    if (params.status) {
        searchParams.set("status", params.status);
    }

    if (params.priority) {
        searchParams.set("priority", params.priority);
    }

    if (params.siteId) {
        searchParams.set("siteId", params.siteId);
    }

    if (params.departmentId) {
        searchParams.set(
            "departmentId",
            params.departmentId
        );
    }

    if (params.search) {
        searchParams.set(
            "search",
            params.search
        );
    }

    const queryString =
        searchParams.toString();

    const url =
        `${API_BASE_URL}/incidents` +
        (queryString
            ? `?${queryString}`
            : "");

    const response = await fetch(url, {
        method: "GET",

        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch incidents"
        );
    }

    /*
     * Your existing backend returns the incidents
     * array in data.data.
     */
    return data.data;
};
export interface IncidentAttachment {
    id: number;
    file_name: string;
    stored_file_name: string;
    file_path: string;
    mime_type: string;
    file_size: number;
    uploaded_by: number | null;
    uploaded_by_user_id: string | null;
    uploaded_by_name: string | null;
    created_at: string;
}

export interface IncidentUpdate {
    id: number;
    update_text: string;
    user_id: number | null;
    update_by_user_id: string | null;
    update_by_name: string | null;
    update_by_designation: string | null;
    created_at: string;
}

export interface ResolutionCycle {
    id: number;
    cycle_number: number;
    started_at: string;
    done_at: string | null;
    work_performed: string | null;
    resolution_details: string | null;
    resolved_by: number | null;
    resolved_by_user_id: string | null;
    resolved_by_name: string | null;
    resolved_by_designation: string | null;
    created_at: string;
}

export interface StatusHistory {
    id: number;
    old_status: string | null;
    new_status: string;
    changed_by: number | null;
    changed_by_user_id: string | null;
    changed_by_name: string | null;
    changed_by_designation: string | null;
    remarks: string | null;
    created_at: string;
}

export interface IncidentReview {
    id: number;
    resolution_cycle_id: number | null;
    reviewed_by: number | null;
    reviewed_by_user_id: string | null;
    reviewed_by_name: string | null;
    reviewed_by_designation: string | null;
    review_result: "APPROVED" | "REOPENED";
    remarks: string | null;
    reviewed_at: string;
}

export interface IncidentAssignment {
    id: number;
    assigned_to: number | null;
    assigned_user_id: string | null;
    assigned_user_name: string | null;

    assigned_department_id: number | null;
    assigned_department_code: string | null;
    assigned_department_name: string | null;

    assigned_sub_department_id: number | null;
    assigned_sub_department_code: string | null;
    assigned_sub_department_name: string | null;

    assigned_by: number | null;
    assigned_by_user_id: string | null;
    assigned_by_name: string | null;

    remarks: string | null;

    assigned_at: string;
    unassigned_at: string | null;
}

export interface IncidentDetailsResponse {
    incident: Incident;
    attachments: IncidentAttachment[];
    updates: IncidentUpdate[];
    resolutionCycles: ResolutionCycle[];
    statusHistory: StatusHistory[];
    reviews: IncidentReview[];
    assignments: IncidentAssignment[];
}
export const getIncidentById = async (
    incidentId: number
): Promise<IncidentDetailsResponse> => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/incidents/${incidentId}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.incident) {
        throw new Error(
            data.message ||
            "Failed to fetch incident details"
        );
    }

    return data;
};
export interface Site {
    id: number;
    site_code: string;
    site_name: string;
    site_lead: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    status: string;
}

export interface Department {
    id: number;
    site_id: number;
    department_code: string;
    department_name: string;
    department_head_name: string | null;
    description: string | null;
    status: string;
}

export interface SubDepartment {
    id: number;
    department_id: number;
    sub_department_code: string;
    sub_department_name: string;
    head_name: string | null;
    description: string | null;
    status: string;
}
export const getSites = async (): Promise<Site[]> => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/sites`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to fetch sites"
        );
    }

    return data.data;
};
export interface CreateSiteRequest {
    siteCode: string;
    siteName: string;
    siteLead?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    status?: string;
}

export const createSite = async (
    site: CreateSiteRequest
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/sites`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(site),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to create site"
        );
    }

    return data;
};

export const updateSite = async (
    siteId: number,
    site: CreateSiteRequest
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/sites/${siteId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(site),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to update site"
        );
    }

    return data;
};

export const updateSiteStatus = async (
    siteId: number,
    status: string
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/sites/${siteId}/status`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to update site status"
        );
    }

    return data;
};
export const getDepartments = async (
    siteId?: number
): Promise<Department[]> => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const url = siteId
        ? `${API_BASE_URL}/departments?siteId=${siteId}`
        : `${API_BASE_URL}/departments`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch departments"
        );
    }

    return data.data;
};
export interface CreateDepartmentRequest {
    siteId: number;
    departmentCode: string;
    departmentName: string;
    departmentHead?: string;
}

export const createDepartment = async (
    department: CreateDepartmentRequest
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/departments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(department),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to create department"
        );
    }

    return data;
};


export const updateDepartment = async (
    departmentId: number,
    department: CreateDepartmentRequest
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/departments/${departmentId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(department),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to update department"
        );
    }

    return data;
};


export const updateDepartmentStatus = async (
    departmentId: number,
    status: string
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/departments/${departmentId}/status`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to update department status"
        );
    }

    return data;
};
export const getSubDepartments = async (
    departmentId?: number
): Promise<SubDepartment[]> => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const url = departmentId
        ? `${API_BASE_URL}/sub-departments?departmentId=${departmentId}`
        : `${API_BASE_URL}/sub-departments`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch sub departments"
        );
    }

    return data.data;
};
export interface CreateSubDepartmentRequest {
    departmentId: number;
    subDepartmentCode: string;
    subDepartmentName: string;
    subDepartmentHead?: string;
    description?: string;
}

export const createSubDepartment = async (
    subDepartment: CreateSubDepartmentRequest
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/sub-departments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(subDepartment),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to create sub-department"
        );
    }

    return data;
};


export const updateSubDepartment = async (
    subDepartmentId: number,
    subDepartment: CreateSubDepartmentRequest
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/sub-departments/${subDepartmentId}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(subDepartment),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to update sub-department"
        );
    }

    return data;
};


export const updateSubDepartmentStatus = async (
    subDepartmentId: number,
    status: string
) => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/sub-departments/${subDepartmentId}/status`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to update sub-department status"
        );
    }

    return data;
};
export interface CreateIncidentRequest {
    siteId: number;
    fromSiteId: number;
    fromDepartmentId: number;
    fromSubDepartmentId?: number | null;
    toSiteId: number;
    toDepartmentId: number;
    toSubDepartmentId?: number | null;
    subject: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}
export const createIncident = async (
    incident: CreateIncidentRequest
) => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/incidents`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify(incident),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to create incident"
        );
    }

    return data;
};
export async function uploadIncidentAttachment(
  incidentId: number,
  file: File
) {
  const token = getToken();

  const formData = new FormData();
  formData.append("attachment", file);

  const response = await fetch(
    `${API_BASE_URL}/incidents/${incidentId}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to upload attachment.");
  }

  return data;
}
export interface AssignIncidentRequest {
  assignedTo: number;
  assignedSubDepartmentId?: number | null;
  remarks?: string;
}

export async function assignIncident(
  incidentId: number,
  request: AssignIncidentRequest
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/incidents/${incidentId}/assign`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to assign incident.");
  }

  return data;
}


export async function startIncidentWork(incidentId: number) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/incidents/${incidentId}/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}), 
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to start incident work.");
  }

  return data;
}


export interface CompleteIncidentRequest {
  workPerformed: string;
  resolutionDetails: string;
}

export async function completeIncident(
  incidentId: number,
  request: CompleteIncidentRequest
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/incidents/${incidentId}/complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to complete incident.");
  }

  return data;
}


export interface ReviewIncidentRequest {
  reviewResult: "APPROVED" | "REOPENED";
  remarks?: string;
}

export async function reviewIncident(
  incidentId: number,
  request: ReviewIncidentRequest
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/incidents/${incidentId}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to review incident.");
  }

  return data;
}
export interface User {
  id: number;
  userId: string;
  employeeCode: string;
  fullName: string;
  email?: string;
  mobile?: string;
  role: string;
  roleName?: string;
  siteId: number | null;
  departmentId: number | null;
  subDepartmentId: number | null;
  designation?: string;
  status: string;
}

export interface User {
    id: number;
    userId: string;
    employeeCode: string;
    fullName: string;
    email?: string;
    mobile?: string;
    role: string;
    roleName?: string;

    siteId: number | null;
    siteCode?: string;
    siteName?: string;

    departmentId: number | null;
    departmentCode?: string;
    departmentName?: string;

    subDepartmentId: number | null;
    subDepartmentCode?: string;
    subDepartmentName?: string;

    designation?: string;
    status: string;
}


export interface CreateUserRequest {
    userId: string;
    employeeCode?: string;
    fullName: string;
    email?: string;
    mobile?: string;
    password?: string;
    roleCode: string;
    siteId: number;
    departmentId?: number | null;
    subDepartmentId?: number | null;
    designation?: string;
}


export async function getUsers(params?: {
    siteId?: number;
    departmentId?: number;
    subDepartmentId?: number;
    role?: string;
    status?: string;
}): Promise<User[]> {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const queryParams = new URLSearchParams();

    if (params?.siteId !== undefined) {
        queryParams.append(
            "siteId",
            String(params.siteId)
        );
    }

    if (params?.departmentId !== undefined) {
        queryParams.append(
            "departmentId",
            String(params.departmentId)
        );
    }

    if (params?.subDepartmentId !== undefined) {
        queryParams.append(
            "subDepartmentId",
            String(params.subDepartmentId)
        );
    }

    if (params?.role) {
        queryParams.append(
            "role",
            params.role
        );
    }

    if (params?.status) {
        queryParams.append(
            "status",
            params.status
        );
    }

    const queryString =
        queryParams.toString();

    const response = await fetch(
        `${API_BASE_URL}/users${
            queryString
                ? `?${queryString}`
                : ""
        }`,
        {
            headers: {
                Authorization:
                    `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to fetch users"
        );
    }

    return data.data.map(
        (user: any): User => ({
            id: user.id,

            userId:
                user.user_id,

            employeeCode:
                user.employee_code || "",

            fullName:
                user.full_name,

            email:
                user.email || "",

            mobile:
                user.mobile || "",

            role:
                user.role_code,

            roleName:
                user.role_name,

            siteId:
                user.site_id ?? null,

            siteCode:
                user.site_code,

            siteName:
                user.site_name,

            departmentId:
                user.department_id ?? null,

            departmentCode:
                user.department_code,

            departmentName:
                user.department_name,

            subDepartmentId:
                user.sub_department_id ?? null,

            subDepartmentCode:
                user.sub_department_code,

            subDepartmentName:
                user.sub_department_name,

            designation:
                user.designation || "",

            status:
                user.status,
        })
    );
}


export const createUser = async (
    user: CreateUserRequest
) => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/users`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/json",

                Authorization:
                    `Bearer ${token}`,
            },

            body: JSON.stringify(user),
        }
    );

    const data =
        await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to create user"
        );
    }

    return data;
};


export const updateUser = async (
    userId: number,
    user: CreateUserRequest
) => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/users/${userId}`,
        {
            method: "PUT",

            headers: {
                "Content-Type":
                    "application/json",

                Authorization:
                    `Bearer ${token}`,
            },

            body: JSON.stringify(user),
        }
    );

    const data =
        await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to update user"
        );
    }

    return data;
};


export const updateUserStatus = async (
    userId: number,
    status: string
) => {

    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/users/${userId}/status`,
        {
            method: "PATCH",

            headers: {
                "Content-Type":
                    "application/json",

                Authorization:
                    `Bearer ${token}`,
            },

            body: JSON.stringify({
                status,
            }),
        }
    );

    const data =
        await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
            "Failed to update user status"
        );
    }

    return data;
};
export interface IncidentReportSummary {
    total: number;
    reported: number;
    assigned: number;
    working: number;
    doneFromMySide: number;
    review: number;
    reopened: number;
    finished: number;
    cancelled: number;
}

export interface IncidentReport {
    id: number;
    incident_no: string;
    subject: string;
    priority: string;
    status: string;
    created_at: string;
    closed_at: string | null;

    site_name: string;

    from_department_name: string | null;
    from_sub_department_name: string | null;

    to_department_name: string | null;
    to_sub_department_name: string | null;

    reported_by_name: string | null;
    assigned_to_name: string | null;
}

export interface IncidentReportResponse {
    summary: IncidentReportSummary;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    departmentCounts: Record<string, number>;
    siteCounts: Record<string, number>;
    incidents: IncidentReport[];
}

export interface IncidentReportParams {
    siteId?: number;
    departmentId?: number;
    status?: string;
    priority?: string;
    fromDate?: string;
    toDate?: string;
}

export const getIncidentReport = async (
    params: IncidentReportParams = {}
): Promise<IncidentReportResponse> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const queryParams = new URLSearchParams();

    if (params.siteId) {
        queryParams.append("siteId", String(params.siteId));
    }

    if (params.departmentId) {
        queryParams.append(
            "departmentId",
            String(params.departmentId)
        );
    }

    if (params.status) {
        queryParams.append("status", params.status);
    }

    if (params.priority) {
        queryParams.append("priority", params.priority);
    }

    if (params.fromDate) {
        queryParams.append("fromDate", params.fromDate);
    }

    if (params.toDate) {
        queryParams.append("toDate", params.toDate);
    }

    const queryString = queryParams.toString();

    const response = await fetch(
        `${API_BASE_URL}/incidents/reports${
            queryString ? `?${queryString}` : ""
        }`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to generate report"
        );
    }

    return data.data;
};
export interface Notification {
    id: number;
    user_id: number;
    incident_id: number | null;
    title: string;
    message: string;
    notification_type: string | null;
    is_read: boolean;
    created_at: string;
    read_at: string | null;
    incident_no?: string | null;
    incident_subject?: string | null;
}

export const getNotifications = async (
    limit = 50
): Promise<Notification[]> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/notifications?limit=${limit}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to fetch notifications"
        );
    }

    return data.data;
};

export const getUnreadNotificationCount =
    async (): Promise<number> => {
        const token = getToken();

        if (!token) {
            throw new Error("Authentication required");
        }

        const response = await fetch(
            `${API_BASE_URL}/notifications/unread-count`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                    "Failed to fetch notification count"
            );
        }

        return data.data.count;
    };

export const markNotificationAsRead = async (
    notificationId: number
): Promise<void> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message ||
                "Failed to mark notification as read"
        );
    }
};

export const markAllNotificationsAsRead =
    async (): Promise<void> => {
        const token = getToken();

        if (!token) {
            throw new Error("Authentication required");
        }

        const response = await fetch(
            `${API_BASE_URL}/notifications/read-all`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                    "Failed to mark notifications as read"
            );
        }
};
export interface AuditLog {
    id: number;
    user_id: number | null;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;

    user_code: string | null;
    user_name: string | null;
    incident_no: string | null;
}

export interface AuditLogParams {
    action?: string;
    entityType?: string;
    userId?: number;
    fromDate?: string;
    toDate?: string;
}

export const getAuditLogs = async (
    params: AuditLogParams = {}
): Promise<AuditLog[]> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const queryParams = new URLSearchParams();

    if (params.action) {
        queryParams.append("action", params.action);
    }

    if (params.entityType) {
        queryParams.append(
            "entityType",
            params.entityType
        );
    }

    if (params.userId) {
        queryParams.append(
            "userId",
            String(params.userId)
        );
    }

    if (params.fromDate) {
        queryParams.append(
            "fromDate",
            params.fromDate
        );
    }

    if (params.toDate) {
        queryParams.append(
            "toDate",
            params.toDate
        );
    }

    const queryString = queryParams.toString();

    const response = await fetch(
        `${API_BASE_URL}/audit-logs${
            queryString ? `?${queryString}` : ""
        }`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to fetch audit logs"
        );
    }

    return data.data;
};

export const savePushSubscription = async (
    subscription: PushSubscription
): Promise<void> => {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication required");
    }

    const subscriptionJson = subscription.toJSON();

    const response = await fetch(
        `${API_BASE_URL}/push/subscribe`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscriptionJson.keys?.p256dh,
                    auth: subscriptionJson.keys?.auth,
                },
            }),
        }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Failed to save push subscription"
        );
    }
};

export const removePushSubscription = async (
    subscription: PushSubscription
): Promise<void> => {
    const token = getToken();

    if (!token) {
        return;
    }

    const response = await fetch(
        `${API_BASE_URL}/push/unsubscribe`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                endpoint: subscription.endpoint,
            }),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to remove push subscription");
    }
};
