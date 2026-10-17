import React from "react";
import ReactDOM from "react-dom/client";

import { HashRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

const appBasePath = "/incidentManagement";
const currentPath = window.location.pathname;

if (
    !window.location.hash &&
    currentPath.startsWith(`${appBasePath}/`) &&
    currentPath !== `${appBasePath}/`
) {
    window.history.replaceState(
        null,
        "",
        `${appBasePath}/#${currentPath.slice(appBasePath.length)}${window.location.search}`
    );
}

ReactDOM.createRoot(
    document.getElementById("root")!
).render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>
);
