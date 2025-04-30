import { useState } from "react";
import FeedbackChat from "./components/FeedbackChat/FeedbackChat";
import AdminPage from "./pages/AdminPage/AdminPage";
import styles from "./App.module.scss";

function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return showAdmin ? (
    <div className={styles.adminWrapper}>
      <button onClick={() => setShowAdmin(false)} className={styles.toggleButton}>
        Back to Chatbot
      </button>
      <AdminPage />
    </div>
  ) : (
    <FeedbackChat toggleAdmin={() => setShowAdmin(true)} />
  );
}

export default App;
