// ActionPlanTab.js
import { useEffect, useState } from "react";
import styles from "./ActionPlanTab.module.scss";

const categories = [
  "View All", "Taste", "Packaging", "Price", "Availability",
  "Store Experience", "Promotions", "Sustainability", "Family-Friendliness"
];

function ActionPlanTab({ actionPlanCache, setActionPlanCache }) {
  const [selectedCategory, setSelectedCategory] = useState("View All");
  const [actionSteps, setActionSteps] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [meta, setMeta] = useState([]);
  const [expandedStep, setExpandedStep] = useState(null);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 15;
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchPlan = async () => {
      if (actionPlanCache[selectedCategory]) {
        const cached = actionPlanCache[selectedCategory];
        setActionSteps(cached.steps);
        setClusters(cached.grouped);
        setMeta(cached.meta);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/generate-category-action-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: selectedCategory })
        });
        const data = await res.json();

        setActionSteps(data.action_plan);
        setClusters(data.clusters);
        setMeta(data.meta);

        setActionPlanCache(prev => ({
          ...prev,
          [selectedCategory]: {
            steps: data.action_plan,
            grouped: data.clusters,
            meta: data.meta
          }
        }));
      } catch (err) {
        console.error("Failed to load action plan:", err);
        setActionSteps([]);
        setClusters([]);
        setMeta([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [selectedCategory]);

  const totalPages = Math.ceil(actionSteps.length / itemsPerPage);
  const visibleSteps = actionSteps.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleExpand = (index) => {
    setExpandedStep(index === expandedStep ? null : index);
  };

  const formatSentence = (text) => {
    if (!text) return "";
    let formatted = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(formatted)) {
      formatted += ".";
    }
    return formatted;
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <label htmlFor="category-select">Category:</label>
        <select
          id="category-select"
          className={styles.dropdown}
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
            setExpandedStep(null);
          }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Generating action plan...</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.actionTable}>
            <thead>
              <tr>
                <th>Action Step</th>
                <th>Impact</th>
                <th>Effort</th>
              </tr>
            </thead>
            <tbody>
              {visibleSteps.map((step, idx) => {
                const globalIdx = (page - 1) * itemsPerPage + idx;
                const metaInfo = meta[globalIdx] || {};
                const summaries = clusters[globalIdx] || [];
                const isExpanded = expandedStep === globalIdx;

                return (
                  <>
                    <tr
                      key={globalIdx}
                      className={styles.stepRow}
                      onClick={() => summaries.length > 0 && handleExpand(globalIdx)}
                    >
                      <td>
                        {summaries.length > 0 && (
                          <span className={styles.dropdownArrow}>{isExpanded ? "▼" : "▶"}</span>
                        )}
                        {formatSentence(step)}
                      </td>
                      <td className={styles.impact}>{metaInfo.impact || "-"}</td>
                      <td className={styles.effort}>{metaInfo.effort || "-"}</td>
                    </tr>
                    {isExpanded && summaries.length > 0 && (
                      <tr className={styles.expandedRow} key={`expand-${globalIdx}`}>
                        <td colSpan={3}>
                          <div className={styles.expandContent}>
                            <ul className={styles.summaryList}>
                              {summaries.map((s, i) => (
                                <li key={i} className={styles.summary}>
                                  <a href={`/conversation/${s.session_id}`} className={styles.summaryLink}>
                                    {s.summary}
                                  </a>{" "}
                                  <span className={styles.confidence}>({(s.score * 100).toFixed(1)}%)</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

export default ActionPlanTab;
