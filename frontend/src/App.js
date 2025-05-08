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
import DuplicatesTab from "./components/DuplicatesTab/DuplicatesTab";
import ActionPlanTab from "./components/ActionPlanTab/ActionPlanTab";
import OverviewTab from "./components/OverviewTab/OverviewTab";
import MapWithFeedback from "./components/MapWithFeedback/MapWithFeedback";
import SideBar from "./components/SideBar/SideBar"; // import the sidebar

import styles from "./App.module.scss";
// Import Leaflet CSS (only once in the app)
import 'leaflet/dist/leaflet.css';

// Optional: Fix for default marker icons
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import Footer from "./components/Footer/Footer";

function AppWrapper(className) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [submittedName, setSubmittedName] = useState(null);
  const [activeCategory, setActiveCategory] = useState("View All");
  const [triggerCategoryReport, setTriggerCategoryReport] = useState(false);
  const [allSummaries, setAllSummaries] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [summaries, setSummaries] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

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
    // try {
    //   const res = await fetch("http://localhost:8000/get-location-count");
    //   const data = await res.json();
    //   setAllSummaries(data);
    // } catch (err) {
    //   console.error("Failed to load summaries:", err);
    // }
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
          <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      ) : location.pathname === "/" ? (
        <>
      
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
      )  : null}
    </div>
  );  

  return (
    <div className={className}>
      {renderHeader()}
      <div className={styles.contentBody}>
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
              {activeTab === "feedBackWithGeo" && (
                <div><MapWithFeedback/></div>
              )}
            </div>
          }
        />

        <Route
          path="/conversation/:sessionId"
          element={<ConversationPage />}
        />
      </Routes>
      </div>
      {/* <Footer/> */}
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className={styles.appLayout}>
        <SideBar/>
        <AppWrapper className={styles.mainContent}/>
      </div>
      {/* <Footer className={styles.Footer}/> */}
    </Router>
  );
}

export default App;
