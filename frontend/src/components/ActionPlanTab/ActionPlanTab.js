// ActionPlanTab.js
import { useEffect, useState } from "react";
import styles from "./ActionPlanTab.module.scss";
import { FaSpinner } from "react-icons/fa";

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
  const itemsPerPage = 5;
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

  return (
    <div className={styles.container}>
      <h2>📋 Action Plans by Category</h2>

      <select
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

      {loading ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p className={styles.loading}>Loading action plan...</p>
        </div>
      ) : (
        <ul className={styles.actionList}>
          {visibleSteps.map((step, idx) => {
            const globalIdx = (page - 1) * itemsPerPage + idx;
            const metaInfo = meta[globalIdx] || {};
            const summaries = clusters[globalIdx] || [];

            return (
              <li key={globalIdx} className={styles.actionItem}>
                <div className={styles.stepHeader} onClick={() => handleExpand(globalIdx)}>
                  <span className={styles.dropdownArrow}>{expandedStep === globalIdx ? "▼" : "▶"}</span>
                  <span>{step}</span>
                  <span className={styles.metaInfo}>
                    ({metaInfo.match_count} matches, avg score: {metaInfo.avg_score})
                  </span>
                </div>
                {expandedStep === globalIdx && (
                  <ul className={styles.summaryList}>
                    {summaries.map((s, i) => (
                      <li key={i} className={styles.summary}>
                        {s.summary} <span className={styles.confidence}>({(s.score * 100).toFixed(1)}%)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
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