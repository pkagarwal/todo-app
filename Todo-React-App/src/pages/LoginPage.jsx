import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import { useTitle } from "../useTitle";

export default function LoginPage() {
  useTitle("Log In");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate(searchParams.get("next") || "/");
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>Log In</h1>
      </header>

      <form className="edit-form" onSubmit={handleSubmit}>
        {error && <p className="stats">{error}</p>}
        <label>
          Username
          <input type="text" name="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <div className="edit-actions">
          <button type="submit">Log In</button>
        </div>
      </form>
    </>
  );
}
