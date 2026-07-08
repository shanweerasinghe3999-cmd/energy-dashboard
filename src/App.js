import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ background:"#080c14", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#00c896", fontFamily:"sans-serif", fontSize:18 }}>
      ⚡ Loading Smart Energy System...
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={!user ? <Login />    : <Navigate to="/dashboard"/>} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard"/>} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login"/>} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"}/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;