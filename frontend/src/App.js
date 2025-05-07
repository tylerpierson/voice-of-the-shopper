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
import AdminPage from "./pages/AdminPage/AdminPage";
import NavBar from "./components/NavBar/NavBar";
import ActionPlanTab from "./components/ActionPlanTab/ActionPlanTab";
import OverviewTab from "./components/OverviewTab/OverviewTab";

import styles from "./App.module.scss";
import MapWithFeedback from "./components/MapWithFeedback/MapWithFeedback";
import ModalPopUp from "./components/ModalPopUp/ModalPopUp";
// Import Leaflet CSS (only once in the app)
import 'leaflet/dist/leaflet.css';

// Optional: Fix for default marker icons
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

function AppWrapper() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);
  const [activeCategory, setActiveCategory] = useState("View All");
  const [triggerCategoryReport, setTriggerCategoryReport] = useState(false);
  const [allSummaries, setAllSummaries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [summaries, setSummaries] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  const handleModalUp = () => {
    if (!isModalOpen) { setIsModalOpen(true) } else { setIsModalOpen(false)}
  }
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

  const fetchLocationCount = async () => {
    try {
      const res = await fetch("http://localhost:8000/get-location-count");
      const data = await res.json();
      setAllSummaries(data);
    } catch (err) {
      console.error("Failed to load summaries:", err);
    }
  };


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
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
      ) :location.pathname.startsWith("/ModalPopUp") ? (
        <>
          <button onClick={()=>{handleModalUp()}} className={styles.showFeedbackButton}>Show Feedback  count</button>
           <ModalPopUp isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <MapWithFeedback/>
        </ModalPopUp>
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
              {activeTab === "action" && (
                <ActionPlanTab
                  summaries={summaries}
                />
              )}
              {activeTab === "feedBackWithGeo" && (
                <div>
                  { !isModalOpen && <button onClick={()=>{handleModalUp()}} className={styles.showFeedbackButton}>Show Feedback  count</button>
                  }
                
                <ModalPopUp isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                 <MapWithFeedback/>
             </ModalPopUp>
             </div>
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
