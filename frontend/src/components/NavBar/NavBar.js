import styles from "./NavBar.module.scss";

function NavBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "feedback", label: "Feedback List" },
    { id: "action", label: "Action Plan" },
    { id: "feedBackWithGeo", label: "Feedback with Geo Location" }
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
