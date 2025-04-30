import { useState } from "react";
import FeedbackChat from "./components/FeedbackChat/FeedbackChat";
import AdminPage from "./pages/AdminPage/AdminPage";
import styles from "./App.module.scss";

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [submittedName, setSubmittedName] = useState(null);

  if (showAdmin) {
    return (
      <div>
        <button className={styles.backButton} onClick={() => setShowAdmin(false)} style={{ margin: 20 }}>
          Back to Chatbot
        </button>
        <AdminPage />
      </div>
    );
  }

  if (!submittedName) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2>Welcome! Please enter your name to begin.</h2>
        <input
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          style={{ padding: "10px", fontSize: "16px", marginRight: "10px" }}
        />
        <button
          onClick={() => {
            if (userName.trim()) setSubmittedName(userName.trim());
          }}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Start
        </button>
      </div>
    );
  }

  return (
    <FeedbackChat
      toggleAdmin={() => setShowAdmin(true)}
      userName={submittedName}
    />
  );
}

export default App;
