import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminPage.module.scss";

const categories = [
  "View All", "Taste", "Packaging", "Price", "Availability",
  "Store Experience", "Promotions", "Sustainability", "Family-Friendliness"
];

function AdminPage({ onBackToChatbot, currentCategory, setActiveCategory, triggerCategoryReport }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [unseenCounts, setUnseenCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSentiment, setFilterSentiment] = useState("");
  const [sortKey, setSortKey] = useState("timestamp");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const navigate = useNavigate();
  const sentiments = ["positive", "neutral", "negative"];

  useEffect(() => {
    if (!triggerCategoryReport) return;

    const summariesInCategory = feedbackList.filter(fb =>
      currentCategory === "View All" || fb.department === currentCategory
    );

    console.log("🔍 Generating category report for:", currentCategory);
    console.table(summariesInCategory);
  }, [triggerCategoryReport, currentCategory, feedbackList]);

  useEffect(() => {
    fetch("http://localhost:8000/get-summaries")
      .then((res) => res.json())
      .then((data) => {
        const seenSessions = JSON.parse(localStorage.getItem("seenSessions") || "{}");
        const unseenCount = {};

        data.forEach(({ department, session_id, seen }) => {
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
      await fetch(`http://localhost:8000/delete-summary/${session_id}`, { method: "DELETE" });
      setFeedbackList((prev) => prev.filter((fb) => fb.session_id !== session_id));
    } catch (err) {
      console.error("Error deleting summary:", err);
    }
  };

  const getSentimentStyle = (sentiment) => {
    switch (sentiment.toLowerCase()) {
      case "positive": return { backgroundColor: "#d4edda", color: "#155724" };
      case "neutral": return { backgroundColor: "#fff3cd", color: "#856404" };
      case "negative": return { backgroundColor: "#f8d7da", color: "#721c24" };
      default: return { backgroundColor: "#e2e3e5", color: "#383d41" };
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return (
      <div className={styles.timestamp}>
        <span>{date.toLocaleDateString()}</span>
        <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    );
  };  

  const handleTabClick = async (cat) => {
    const category = cat || "View All";
    setActiveCategory(category);
    setCurrentPage(1);
    if (category !== "View All") {
      try {
        await fetch(`http://localhost:8000/mark-seen/${category}`, { method: "POST" });
        const updatedSeenSessions = JSON.parse(localStorage.getItem("seenSessions") || "{}");
        feedbackList.forEach((fb) => {
          if (fb.department === category) {
            updatedSeenSessions[fb.session_id] = true;
          }
        });
        localStorage.setItem("seenSessions", JSON.stringify(updatedSeenSessions));

        setUnseenCounts((prev) => {
          const updated = { ...prev };
          delete updated[category];
          return updated;
        });
      } catch (err) {
        console.error("Failed to mark as seen:", err);
      }
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const goToConversationPage = (session_id) => navigate(`/conversation/${session_id}`);

  const filteredFeedbacks = feedbackList.filter((fb) => {
    const matchesQuery =
      fb.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.user_name || "anonymous").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSentiment = filterSentiment
      ? fb.sentiment.toLowerCase() === filterSentiment.toLowerCase()
      : true;

    const matchesCategory =
      currentCategory === "View All" || fb.department === currentCategory;

    return matchesQuery && matchesSentiment && matchesCategory;
  });

  const sortedFeedbacks = [...filteredFeedbacks].sort((a, b) => {
    const valA = a[sortKey] || "";
    const valB = b[sortKey] || "";

    const getRank = (sentiment) => {
      switch ((sentiment || "").toLowerCase()) {
        case "positive": return 1;
        case "neutral": return 2;
        case "negative": return 3;
        default: return 4;
      }
    };

    let result = 0;

    if (sortKey === "sentiment") {
      result = getRank(valA) - getRank(valB);
    } else if (sortKey === "timestamp") {
      result = new Date(valA) - new Date(valB);
    } else {
      result = String(valA).localeCompare(String(valB));
    }

    return sortDirection === "asc" ? result : -result;
  });

  const pageCount = Math.ceil(sortedFeedbacks.length / itemsPerPage);
  const paginatedFeedbacks = sortedFeedbacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

return (
      <div className={styles.container}>
        {/* Title */}
        <header className={styles.header}>
          <h1 className={styles.title}>Customer Feedback List</h1>
        </header>

        {/* Tabs */}
        <section className={styles.tabsWrapper}>
          <div className={styles.tabs}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`${styles.tabButton} ${cat === currentCategory ? styles.activeTab : ""}`}
                onClick={() => handleTabClick(cat)}
              >
                {cat}
                {cat !== "View All" && unseenCounts[cat] && (
                  <span className={styles.notificationDot}>{unseenCounts[cat]}</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className={styles.filters}>
          <input
            type="text"
            placeholder="Search by user or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />

          <select
            value={currentCategory === "View All" ? "" : currentCategory}
            onChange={(e) => handleTabClick(e.target.value || "View All")}
            className={styles.dropdown}
          >
            <option value="">All Categories</option>
            {categories.filter((c) => c !== "View All").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filterSentiment}
            onChange={(e) => setFilterSentiment(e.target.value)}
            className={styles.dropdown}
          >
            <option value="">All Sentiments</option>
            {sentiments.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </section>

        {/* Table */}
        <section className={styles.tableSection}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <div className={styles.sortHeader} onClick={() => handleSort("timestamp")}>
                    Date
                    <span className={`${styles.sortArrow} ${sortKey === "timestamp" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                    <span className={`${styles.sortArrow} ${sortKey === "timestamp" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
                  </div>
                </th>
                <th>Summary</th>
                <th>
                  <div className={styles.sortHeader} onClick={() => handleSort("sentiment")}>
                    Sentiment
                    <span className={`${styles.sortArrow} ${sortKey === "sentiment" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                    <span className={`${styles.sortArrow} ${sortKey === "sentiment" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
                  </div>
                </th>
                <th>
                  <div className={styles.sortHeader} onClick={() => handleSort("department")}>
                    Category
                    <span className={`${styles.sortArrow} ${sortKey === "department" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                    <span className={`${styles.sortArrow} ${sortKey === "department" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
                  </div>
                </th>
                <th>
                  <div className={styles.sortHeader} onClick={() => handleSort("user_name")}>
                    User
                    <span className={`${styles.sortArrow} ${sortKey === "user_name" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                    <span className={`${styles.sortArrow} ${sortKey === "user_name" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
                  </div>
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFeedbacks.map((fb) => (
                <tr
                  key={fb.session_id}
                  className={styles.clickableRow}
                  onClick={() => goToConversationPage(fb.session_id)}
                >
                  <td className={styles.td}>{formatDate(fb.timestamp)}</td>
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
                        e.stopPropagation();
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
        </section>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className={styles.pagination}>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              &lt; Prev
            </button>
            <span>Page {currentPage} of {pageCount}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>
              Next &gt;
            </button>
          </div>
        )}

        {/* Action Plan */}
        {selectedSessionId && (
          <ActionPlan sessionId={selectedSessionId} onClose={() => setSelectedSessionId(null)} />
        )}
      </div>
);

      <table className={styles.table}>
        <thead>
          <tr>
            <th>
              <div className={styles.sortHeader} onClick={() => handleSort("timestamp")}>Date
                <span className={`${styles.sortArrow} ${sortKey === "timestamp" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                <span className={`${styles.sortArrow} ${sortKey === "timestamp" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
              </div>
            </th>
            <th>Summary</th>
            <th>
              <div className={styles.sortHeader} onClick={() => handleSort("sentiment")}>Sentiment
                <span className={`${styles.sortArrow} ${sortKey === "sentiment" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                <span className={`${styles.sortArrow} ${sortKey === "sentiment" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
              </div>
            </th>
            <th>
              <div className={styles.sortHeader} onClick={() => handleSort("department")}>Category
                <span className={`${styles.sortArrow} ${sortKey === "department" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                <span className={`${styles.sortArrow} ${sortKey === "department" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
              </div>
            </th>
            <th>
              <div className={styles.sortHeader} onClick={() => handleSort("user_name")}>User
                <span className={`${styles.sortArrow} ${sortKey === "user_name" && sortDirection === "asc" ? styles.activeArrow : ""}`}>▲</span>
                <span className={`${styles.sortArrow} ${sortKey === "user_name" && sortDirection === "desc" ? styles.activeArrow : ""}`}>▼</span>
              </div>
            </th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginatedFeedbacks.map((fb) => (
            <tr
              key={fb.session_id}
              className={styles.clickableRow}
              onClick={() => goToConversationPage(fb.session_id)}
            >
              <td className={styles.td}>{formatDate(fb.timestamp)}</td>
              <td className={styles.td}>{fb.summary}</td>
              <td className={styles.td}>
                <span style={getSentimentStyle(fb.sentiment)} className={styles.badge}>{fb.sentiment}</span>
              </td>
              <td className={styles.td}>{fb.department}</td>
              <td className={styles.td}>{fb.user_name || "Anonymous"}</td>
              <td className={styles.td}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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

      {pageCount > 1 && (
        <div className={styles.pagination}>
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            &lt; Prev
          </button>
          <span>Page {currentPage} of {pageCount}</span>
          <button onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}>
            Next &gt;
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
