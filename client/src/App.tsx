import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Incidents from "./pages/Incidents";
import IncidentDetails from "./pages/IncidentDetails";
import ReportIncident from "./pages/ReportIncident";
import Sites from "./pages/Sites";
import Departments from "./pages/Departments";
import SubDepartments from "./pages/SubDepartments";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";


const App = () => {
    return (
        <Routes>

            {/* Public */}
            <Route
                path="/login"
                element={<Login />}
            />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>

                <Route element={<Layout />}>

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                   <Route
                        path="/incidents"
                        element={<Incidents />}
                    />

                    <Route
                        path="/incidents/new"
                        element={<ReportIncident />}
                    />

                    <Route
                        path="/incidents/:id"
                        element={<IncidentDetails />}
                    />
                    <Route
                        path="/sites"
                        element={<Sites />}
                    />

                    <Route
                        path="/departments"
                        element={<Departments />}
                    />
                    <Route
                        path="/sub-departments"
                        element={<SubDepartments />}
                    />
                    <Route
                        path="/users"
                        element={<Users />}
                    />

                    <Route path="/reports" element={<Reports />} />
                    <Route
                        path="/audit-logs"
                        element={<AuditLogs />}
                    />

                </Route>

            </Route>

            {/* Default */}
            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

            {/* Unknown */}
            <Route
                path="*"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

        </Routes>
    );
};

export default App;