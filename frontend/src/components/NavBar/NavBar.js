import styles from "./NavBar.module.scss";
import { FaChartBar, FaCommentDots, FaClone, FaClipboardCheck, FaMapMarkedAlt } from "react-icons/fa";

function NavBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "overview", label: "Overview", icon: <FaChartBar /> },
    { id: "feedback", label: "Feedback List", icon: <FaCommentDots /> },
    { id: "duplicates", label: "Duplicates", icon: <FaClone /> },
    { id: "action", label: "Action Plan", icon: <FaClipboardCheck /> },
    { id: "feedBackWithGeo", label: "Feedback with Geo Location", icon: <FaMapMarkedAlt /> }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId); // Update the active tab state
  };

  return (
    <nav className={styles.navbar}>
      <ul className={styles.navList}>
        {tabs.map((tab) => (
          <li key={tab.id} className={styles.tabItem}>
            <button
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span className={styles.icon}>{tab.icon}</span>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default NavBar;
