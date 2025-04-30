import { useEffect, useState } from "react";
import style from "./AdminPage.module.scss";

function AdminPage() {
  const [feedbackList, setFeedbackList] = useState([]);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = () => {
    fetch("http://localhost:8000/get-summaries")
      .then((res) => res.json())
      .then((data) => setFeedbackList(data))
      .catch((err) => console.error("Error fetching feedbacks:", err));
  };

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

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "auto" }}>
      <h1 style={{ marginBottom: "20px" }}>Admin Feedback Dashboard</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f1f1f1" }}>
            <th style={styles.th}>Summary</th>
            <th style={styles.th}>Sentiment</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {feedbackList.map((fb) => (
            <tr key={fb.session_id} style={{ borderBottom: "1px solid #ccc" }}>
              <td style={styles.td}>{fb.summary}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, ...getSentimentStyle(fb.sentiment) }}>
                  {fb.sentiment}
                </span>
              </td>
              <td style={styles.td}>{fb.department}</td>
              <td style={styles.td}>
                <button onClick={() => deleteSummary(fb.session_id)} style={styles.deleteBtn}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  th: {
    textAlign: "left",
    padding: "10px",
    fontWeight: "bold",
    fontSize: "16px",
  },
  td: {
    padding: "10px",
    verticalAlign: "top",
  },
  badge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: 500,
    textTransform: "capitalize",
  },
  deleteBtn: {
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default AdminPage;

