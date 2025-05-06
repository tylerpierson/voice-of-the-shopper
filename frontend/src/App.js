import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

import FeedbackChat from "./components/FeedbackChat/FeedbackChat";
import ProgressiveOnboarding from "./components/ProgressiveOnboarding/ProgressiveOnboarding";
import ConversationPage from "./pages/ConversationPage/ConversationPage";
import ActionPlanReport from "./components/ActionPlanReport/ActionPlanReport";
import AdminPage from "./pages/AdminPage/AdminPage";
import NavBar from "./components/NavBar/NavBar";
import DuplicatesTab from "./components/DuplicatesTab/DuplicatesTab";
import ActionPlanTab from "./components/ActionPlanTab/ActionPlanTab";
import OverviewTab from "./components/OverviewTab/OverviewTab";

import styles from "./App.module.scss";

function AppWrapper() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);
  const [activeCategory, setActiveCategory] = useState("View All");
  const [activeTab, setActiveTab] = useState("overview");
  const [summaries, setSummaries] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  const handleResetUserName = () => {
    setShowOnboarding(false);
    setSubmittedName(null);
    navigate("/");
  };

  useEffect(() => {
    if (location.pathname === "/admin") {
      fetch("http://localhost:8000/get-summaries")
        .then((res) => res.json())
        .then(setSummaries)
        .catch(console.error);
    }
  }, [location.pathname]);

  const renderHeader = () => (
    <div className={styles.header}>
      {location.pathname === "/admin" ? (
        <>
          <img
            src="/img/vos_logo.png"
            alt="Voice of the Shopper"
            className={styles.logo}
          />
          <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
          <button className={styles.backButton} onClick={handleResetUserName}>
            Back to Chatbot
          </button>
        </>
      ) : location.pathname === "/" ? (
        <>
          <img
            src="/img/vos_logo.png"
            alt="Voice of the Shopper"
            className={styles.logo}
          />
          <button
            className={styles.backButton}
            onClick={() => navigate("/admin")}
          >
            Go to Admin Dashboard
          </button>
        </>
      ) : location.pathname.startsWith("/conversation") ? (
        <>
          <img
            src="/img/vos_logo.png"
            alt="Voice of the Shopper"
            className={styles.logo}
          />
          <button
            className={styles.backButton}
            onClick={() => navigate("/admin")}
          >
            Back to Admin Dashboard
          </button>
        </>
      ) : null}
    </div>
  );  

  return (
    <>
      {renderHeader()}

      <Routes>
        <Route
          path="/"
          element={
            showOnboarding ? (
              <ProgressiveOnboarding
                onFinish={() => setShowOnboarding(false)}
              />
            ) : (
              <FeedbackChat
                toggleAdmin={() => navigate("/admin")}
                userName={submittedName || "Anonymous"}
                setUserName={setSubmittedName}
                resetUserName={handleResetUserName}
              />
            )
          }
        />

        <Route
          path="/admin"
          element={
            <div className={styles.tabContent}>
              {activeTab === "overview" && (
                <OverviewTab
                  category="View All"
                  summaries={summaries}
                />
              )}
              {activeTab === "feedback" && (
                <AdminPage
                  currentCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                />
              )}
              {activeTab === "duplicates" && (
                <DuplicatesTab />
              )}
              {activeTab === "action" && (
                <ActionPlanTab
                  summaries={summaries}
                />
              )}
            </div>
          }
        />

        <Route
          path="/conversation/:sessionId"
          element={<ConversationPage />}
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppWrapper />
    </Router>
  );
}

export default App;
