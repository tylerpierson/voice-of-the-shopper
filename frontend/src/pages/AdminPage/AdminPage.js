import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminPage.module.scss";

const categories = [
  "View All", "Taste", "Packaging", "Price", "Availability",
  "Store Experience", "Promotions", "Sustainability", "Family-Friendliness"
];

function AdminPage({ onBackToChatbot }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [activeCategory, setActiveCategory] = useState("View All");
  const [unseenCounts, setUnseenCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8000/get-summaries")
      .then((res) => res.json())
      .then((data) => {
        const seenSessions = JSON.parse(localStorage.getItem("seenSessions") || "{}");
        const unseenCount = {};

        data.forEach((summary) => {
          const { department, session_id, seen } = summary;
          if (!seenSessions[session_id] && !seen) {
            unseenCount[department] = (unseenCount[department] || 0) + 1;
          }
        });

        setUnseenCounts(unseenCount);
        setFeedbackList(data);
      })
      .catch((err) => console.error("Error fetching feedbacks:", err));
  }, []);

  const deleteSummary = async (session_id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this feedback?");
    if (!confirmDelete) return;

    try {
      await fetch(`http://localhost:8000/delete-summary/${session_id}`, {
        method: "DELETE",
      });
      setFeedbackList((prev) => prev.filter((fb) => fb.session_id !== session_id));
    } catch (err) {
      console.error("Error deleting summary:", err);
    }
  };

  const getSentimentStyle = (sentiment) => {
    switch (sentiment.toLowerCase()) {
      case "positive":
        return { backgroundColor: "#d4edda", color: "#155724" };
      case "neutral":
        return { backgroundColor: "#fff3cd", color: "#856404" };
      case "negative":
        return { backgroundColor: "#f8d7da", color: "#721c24" };
      default:
        return { backgroundColor: "#e2e3e5", color: "#383d41" };
    }
  };

  const sentiments = ["positive", "neutral", "negative"];

  const filteredFeedbacks = activeCategory === "View All"
    ? feedbackList
    : feedbackList.filter((fb) => fb.department === activeCategory);

  const groupedBySentiment = sentiments.reduce((acc, sentiment) => {
    acc[sentiment] = filteredFeedbacks.filter(
      (fb) => fb.sentiment.toLowerCase() === sentiment
    );
    return acc;
  }, {});

  const handleTabClick = async (cat) => {
    setActiveCategory(cat);

    if (cat !== "View All") {
      try {
        await fetch(`http://localhost:8000/mark-seen/${cat}`, {
          method: "POST",
        });

        const updatedSeenSessions = JSON.parse(localStorage.getItem("seenSessions") || "{}");
        feedbackList.forEach((fb) => {
          if (fb.department === cat) {
            updatedSeenSessions[fb.session_id] = true;
          }
        });
        localStorage.setItem("seenSessions", JSON.stringify(updatedSeenSessions));

        setUnseenCounts((prev) => {
          const updated = { ...prev };
          delete updated[cat];
          return updated;
        });
      } catch (err) {
        console.error("Failed to mark as seen:", err);
      }
    }
  };

  const goToConversationPage = (session_id) => {
    navigate(`/conversation/${session_id}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Admin Feedback Dashboard</h1>

      <div className={styles.tabs}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`${styles.tabButton} ${cat === activeCategory ? styles.activeTab : ""}`}
            onClick={() => handleTabClick(cat)}
          >
            {cat}
            {cat !== "View All" && unseenCounts[cat] && (
              <span className={styles.notificationDot}>{unseenCounts[cat]}</span>
            )}
          </button>
        ))}
      </div>

      {sentiments.map((sentiment) => (
        <div key={sentiment} className={styles.sentimentSection}>
          <h2 className={styles.sentimentHeader} style={getSentimentStyle(sentiment)}>
            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Feedback
          </h2>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Summary</th>
                <th>Sentiment</th>
                <th>Category</th>
                <th>User</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {groupedBySentiment[sentiment].map((fb) => (
                <tr
                  key={fb.session_id}
                  className={styles.clickableRow}
                  onClick={() => goToConversationPage(fb.session_id)}
                >
                  <td className={styles.td}>{fb.summary}</td>
                  <td className={styles.td}>
                    <span style={getSentimentStyle(fb.sentiment)} className={styles.badge}>
                      {fb.sentiment}
                    </span>
                  </td>
                  <td className={styles.td}>{fb.department}</td>
                  <td className={styles.td}>{fb.user_name || "Anonymous"}</td>
                  <td className={styles.td}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // prevent row click from triggering
                        deleteSummary(fb.session_id);
                      }}
                      className={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </td>
                </tr>              
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default AdminPage;
