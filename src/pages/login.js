import { useState } from "react";
import { auth } from "../firebase/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080c14; font-family: 'DM Sans', sans-serif; font-size: 13px; }
  .page { min-height: 100vh; background: #080c14; background-image: radial-gradient(ellipse at 20% 10%, rgba(0,200,150,0.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0,120,255,0.06) 0%, transparent 50%); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 40px; width: 100%; max-width: 420px; }
  .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; justify-content: center; flex-direction: column; text-align: center; }
  .logo-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #00c896, #0070f3); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 0 28px rgba(0,200,150,0.35); margin-bottom: 8px; }
  .logo h1 { font-family: 'Rajdhani', sans-serif; font-size: 22px; font-weight: 700; background: linear-gradient(90deg, #00c896, #60efff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 1.5px; }
  .logo-sub { font-size: 11px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  .greeting { text-align: center; margin-bottom: 28px; padding: 16px; background: rgba(0,200,150,0.05); border: 1px solid rgba(0,200,150,0.1); border-radius: 12px; }
  .greeting-title { font-family: 'Rajdhani', sans-serif; font-size: 22px; font-weight: 700; color: #e2e8f0; margin-bottom: 6px; }
  .greeting-sub { font-size: 13px; color: #94a3b8; line-height: 1.5; }
  .greeting-sub span { color: #00c896; font-weight: 600; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 11px; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
  .field input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 16px; color: #e2e8f0; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s; }
  .field input:focus { border-color: #00c896; background: rgba(0,200,150,0.05); }
  .field input::placeholder { color: #475569; }
  .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #00c896, #0070f3); border: none; border-radius: 10px; color: white; font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; margin-top: 8px; transition: opacity 0.2s, transform 0.2s; letter-spacing: 0.5px; }
  .btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .error { background: rgba(225,29,72,0.1); border: 1px solid rgba(225,29,72,0.2); border-radius: 8px; padding: 10px 14px; color: #fb7185; font-size: 12px; margin-bottom: 16px; }
  .link { text-align: center; margin-top: 20px; font-size: 13px; color: #64748b; }
  .link a { color: #00c896; text-decoration: none; font-weight: 600; cursor: pointer; }
  .link a:hover { text-decoration: underline; }
  .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
  .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
  .divider-text { font-size: 11px; color: #475569; }
`;

function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { time:"Good Morning", emoji:"🌅" };
    if (h < 17) return { time:"Good Afternoon", emoji:"☀️" };
    return { time:"Good Evening", emoji:"🌙" };
  };

  const { time, emoji } = getGreeting();

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (e) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="page">
        <div className="box">

          <div className="logo">
            <div className="logo-icon">⚡</div>
            <h1>SMART ENERGY SYSTEM</h1>
            <div className="logo-sub">Cloud-Based AI Energy Management • Sri Lanka 🇱🇰</div>
          </div>

          <div className="greeting">
            <div className="greeting-title">{emoji} {time}!</div>
            <div className="greeting-sub">
              Welcome to <span>Smart Energy System</span>.<br/>
              Sign in to monitor your energy usage in real time.
            </div>
          </div>

          {error && <div className="error">⚠️ {error}</div>}

          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)}/>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}/>
          </div>

          <button className="btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <div className="divider">
            <div className="divider-line"/>
            <div className="divider-text">New to Smart Energy System?</div>
            <div className="divider-line"/>
          </div>

          <div className="link">
            <a onClick={() => navigate("/register")}>Create a new account →</a>
          </div>

        </div>
      </div>
    </>
  );
}

export default Login;