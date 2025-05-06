import { useEffect, useState } from "react";
import ActionPlanReport from "../ActionPlanReport/ActionPlanReport";
import AdminPage from "../../pages/AdminPage/AdminPage";
import NavBar from "../../components/NavBar/NavBar"; // ✅ Import NavBar
import styles from "./AdminDashboard.module.scss";

function AdminDashboard({ onBackToChatbot }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeCategory, setActiveCategory] = useState("View All");
  const [summaries, setSummaries] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/get-summaries")
      .then((res) => res.json())
      .then(setSummaries)
      .catch(console.error);
  }, []);

  return (
    <div className={styles.adminWrapper}>
      <div className={styles.tabContent}>
        {activeTab === "overview" && (
          <ActionPlanReport
            steps={[]} // Optional
            impactEffortMap={{}}
            category="View All"
            summaries={summaries}
          />
        )}
        {activeTab === "feedback" && (
          <AdminPage
            onBackToChatbot={onBackToChatbot}
            currentCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
