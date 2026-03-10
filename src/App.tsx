import React, { createContext, useContext, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RootLayout } from "./root-layout";
import Login from "./pages/Login";

export type Role = "lgu-admin" | "brgy-calumpang" | "brgy-sanjuan" | "brgy-southfundidor" | "sys-admin";

interface AuthContextType {
  role: Role | null;
  login: (r: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  login: () => { },
  logout: () => { }
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [role, setRole] = useState<Role | null>(null);

  const login = (r: Role) => setRole(r);
  const logout = () => setRole(null);

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!role ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/*" element={role ? <RootLayout /> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
