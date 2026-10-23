import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function todayDisplay() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function AppShell() {
  const { loggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate("/login");
  };

  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">&#10003;</span>
          <span className="brand-name">Tasklist</span>
        </Link>
        <span className="topbar-date">{todayDisplay()}</span>
        {loggedIn && (
          <form onSubmit={handleLogout} className="logout-form">
            <button type="submit" className="link-btn">Log out</button>
          </form>
        )}
      </header>
      <div className="wrap">
        <Outlet />
      </div>
    </>
  );
}
