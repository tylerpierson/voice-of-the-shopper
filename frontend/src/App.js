import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation
} from "react-router-dom";
import FeedbackChat from "./components/FeedbackChat/FeedbackChat";
import AdminPage from "./pages/AdminPage/AdminPage";
import ConversationPage from "./pages/ConversationPage/ConversationPage";
import ProgressiveOnboarding from "./components/ProgressiveOnboarding/ProgressiveOnboarding";
import ActionPlan from "./components/ActionPlan/ActionPlan";
import styles from "./App.module.scss";

function AppWrapper() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);
  const [username, setUsername] = useState("");
  const [activeCategory, setActiveCategory] = useState("View All");
  const [triggerCategoryReport, setTriggerCategoryReport] = useState(false);
  const [allSummaries, setAllSummaries] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const handleResetUserName = () => {
    setShowOnboarding(false);
    setSubmittedName(null);
    setUsername("");
    navigate("/");
  };

  const fetchAllSummaries = async () => {
    try {
      const res = await fetch("http://localhost:8000/get-summaries");
      const data = await res.json();
      setAllSummaries(data);
    } catch (err) {
      console.error("Failed to load summaries:", err);
    }
  };

  const renderHeader = () => (
    <div className={styles.header}>
      <img src="/img/vos_logo.png" alt="Voice of the Shopper" className={styles.logo} />

      {location.pathname === "/" && submittedName && (
        <button
          className={styles.backButton}
          onClick={() => navigate("/admin")}
          style={{ margin: 20 }}
        >
          Go to Admin Dashboard
        </button>
      )}

      {location.pathname === "/admin" && (
        <div className={styles.headerButtons}>
          <button
            className={styles.backButton}
            onClick={handleResetUserName}
            style={{ margin: 20 }}
          >
            Back to Chatbot
          </button>
          <button
            className={styles.buildReportButton}
            onClick={() => {
              fetchAllSummaries();
              setTriggerCategoryReport(true);
            }}
            style={{ margin: 20 }}
          >
            Build Category Report
          </button>
        </div>
      )}

      {location.pathname.startsWith("/conversation") && (
        <button
          className={styles.backButton}
          onClick={() => navigate("/admin")}
          style={{ margin: 20 }}
        >
          Back to Admin Dashboard
        </button>
      )}
    </div>
  );

  return (
    <>
      {renderHeader()}
      {triggerCategoryReport && (
        <ActionPlan
          category={activeCategory}
          summaries={allSummaries}
          onClose={() => setTriggerCategoryReport(false)}
        />
      )}
      <Routes>
        <Route
          path="/"
          element={
            showOnboarding ? (
              <ProgressiveOnboarding onFinish={() => setShowOnboarding(false)} />
            ) : submittedName ? (
              <FeedbackChat
                toggleAdmin={() => navigate("/admin")}
                userName={submittedName}
                resetUserName={handleResetUserName}
              />
            ) : (
              <div className={styles.formContainer} style={{ padding: "50px", textAlign: "center" }}>
                <h2>Please enter your name to provide feedback.</h2>
                <form
                  className={styles.nameForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (username.trim()) setSubmittedName(username.trim());
                  }}
                >
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      placeholder="Enter Your name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <button type="submit" className={styles.startButton}>Start</button>
                    <button type="button" className={styles.skipButton} onClick={() => setSubmittedName("Anonymous")}>
                      Skip
                    </button>
                  </div>
                </form>
              </div>
            )
          }
        />
        <Route
          path="/admin"
          element={
            <AdminPage
              onBackToChatbot={handleResetUserName}
              currentCategory={activeCategory}
              setActiveCategory={setActiveCategory}
            />
          }
        />
        <Route path="/conversation/:sessionId" element={<ConversationPage />} />
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
