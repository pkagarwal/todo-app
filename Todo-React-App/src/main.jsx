import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./style.css";
import { AuthProvider, RequireLogin } from "./auth";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import TaskListPage from "./pages/TaskListPage";
import EditTaskPage from "./pages/EditTaskPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RequireLogin><TaskListPage /></RequireLogin>} />
            <Route path="/edit/:id" element={<RequireLogin><EditTaskPage /></RequireLogin>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
