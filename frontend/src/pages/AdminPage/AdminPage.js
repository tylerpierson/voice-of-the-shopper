import { useEffect, useState } from "react";
import styles from "./AdminPage.module.scss";

const categories = [
  "View All", "Taste", "Packaging", "Price", "Availability",
  "Store Experience", "Promotions", "Sustainability", "Family-Friendliness"
];

function AdminPage() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [activeCategory, setActiveCategory] = useState("View All");
  const [newFeedbackCounts, setNewFeedbackCounts] = useState({});
  const [seenSummaries, setSeenSummaries] = useState(new Set());

  useEffect(() => {
    fetch("http://localhost:8000/get-summaries")
      .then((res) => res.json())
      .then((data) => {
        setFeedbackList(data);

        const counts = {};
        categories.forEach((cat) => {
          if (cat === "View All") return;
          const unseen = data.filter(
            (fb) => fb.department === cat && !seenSummaries.has(fb.session_id)
          );
          if (unseen.length > 0) counts[cat] = unseen.length;
        });
        setNewFeedbackCounts(counts);
      })
      .catch((err) => console.error("Error fetching feedbacks:", err));
  }, [seenSummaries]);

  const deleteSummary = async (session_id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this feedback?");
    if (!confirmDelete) return;

    try {
      await fetch(`http://localhost:8000/delete-summary/${session_id}`, {
        method: "DELETE",
      });
      setFeedbackList((prev) => prev.filter((fb) => fb.session_id !== session_id));
      setSeenSummaries((prev) => new Set([...prev].filter((id) => id !== session_id)));
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

  const handleTabClick = (cat) => {
    setActiveCategory(cat);
    if (cat !== "View All") {
      const seen = feedbackList
        .filter((fb) => fb.department === cat)
        .map((fb) => fb.session_id);
      setSeenSummaries((prev) => new Set([...prev, ...seen]));
      setNewFeedbackCounts((prev) => {
        const updated = { ...prev };
        delete updated[cat];
        return updated;
      });
    }
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
            {cat !== "View All" && newFeedbackCounts[cat] && (
              <span className={styles.notificationDot}>{newFeedbackCounts[cat]}</span>
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
                <tr key={fb.session_id}>
                  <td className={styles.td}>{fb.summary}</td>
                  <td className={styles.td}>
                    <span className={{ ...styles.badge, ...getSentimentStyle(fb.sentiment) }}>
                      {fb.sentiment}
                    </span>
                  </td>
                  <td className={styles.td}>{fb.department}</td>
                  <td className={styles.td}>{fb.user_name || "Anonymous"}</td>
                  <td className={styles.td}>
                    <button onClick={() => deleteSummary(fb.session_id)} className={styles.deleteBtn}>
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
