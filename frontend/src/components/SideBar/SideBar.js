import { useNavigate, useLocation } from "react-router-dom";
import styles from "./SideBar.module.scss";

export default function Sidebar({ isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <div className={`${styles.sidebar} ${styles.open}`}>
      <img
            src="/img/vos_logo.png"
            alt="Voice of the Shopper"
            className={styles.logo}
          />
      <ul className={styles.navList}>
        <li>
          <button
            className={isAdmin ? "" : styles.active}
            onClick={() => {
              navigate("/");
            }}
          >
            Chatbot
          </button>
        </li>
        <li>
          <button
            className={isAdmin ? styles.active : ""}
            onClick={() => {
              navigate("/admin");
            }}
          >
            Admin Dashboard
          </button>
        </li>
      </ul>
    </div>
  );
}
