import styles from "./NavBar.module.scss";

function NavBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "feedback", label: "Feedback List" },
    { id: "duplicates", label: "Duplicates" },
    { id: "action", label: "Action Plan" },
  ];

  return (
    <nav className={styles.navbar}>
      <ul className={styles.navList}>
        {tabs.map((tab) => (
          <li key={tab.id} className={styles.tabItem}>
            <button
              className={`${styles.tabButton} ${
                activeTab === tab.id ? styles.active : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default NavBar;
