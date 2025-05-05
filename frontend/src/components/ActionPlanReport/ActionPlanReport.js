import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import styles from "./ActionPlanReport.module.scss";

function ActionPlanReport() {
  const location = useLocation();
  const navigate = useNavigate();
  const { steps = [], impactEffortMap = {}, category, summaries = [] } = location.state || {};

  useEffect(() => {
    if (!location.state) {
      navigate("/admin"); // redirect if accessed directly
    }
  }, [location.state, navigate]);

  if (!location.state) return null;

  const generateBreakdown = () => {
    if (!summaries || summaries.length === 0) return <p>No data available.</p>;

    if (category === "View All") {
      const breakdown = summaries.reduce((acc, cur) => {
        acc[cur.department] = (acc[cur.department] || 0) + 1;
        return acc;
      }, {});

      return (
        <div className={styles.chartSection}>
          <h4>Summary Breakdown by Category</h4>
          <canvas id="categoryPieChart" width="300" height="300" />
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <script dangerouslySetInnerHTML={{
            __html: `
              window.onload = function () {
                const ctx = document.getElementById('categoryPieChart')?.getContext('2d');
                if (ctx) {
                  new Chart(ctx, {
                    type: 'pie',
                    data: {
                      labels: ${JSON.stringify(Object.keys(breakdown))},
                      datasets: [{
                        data: ${JSON.stringify(Object.values(breakdown))},
                        backgroundColor: [
                          '#FF6384', '#36A2EB', '#FFCE56', '#8BC34A',
                          '#FF9800', '#9C27B0', '#00BCD4', '#E91E63'
                        ]
                      }]
                    },
                    options: {
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }
                  });
                }
              };
            `
          }} />
        </div>
      );
    } else {
      const count = summaries.filter((s) => s.department === category).length;
      return <p>Showing {count} summaries for: <strong>{category}</strong></p>;
    }
  };

  return (
    <div className={styles.reportContainer}>
      <h2>Action Plan Report</h2>
      {category && <p><strong>Category:</strong> {category}</p>}

      <div className={styles.tabs}>
        <button onClick={() => showTab("plan")}>Action Plan</button>
        <button onClick={() => showTab("duplicates")}>Duplicates</button>
        <button onClick={() => showTab("overview")}>Overview</button>
      </div>

      <div id="plan" className={`${styles.tabContent} ${styles.active}`}>
        <ul>
          {steps.map((step, idx) => (
            <li key={idx}>
              <p>{step}</p>
              <p><strong>Impact:</strong> {impactEffortMap[idx]?.impact || "..."}</p>
              <p><strong>Effort:</strong> {impactEffortMap[idx]?.effort || "..."}</p>
            </li>
          ))}
        </ul>
      </div>

      <div id="duplicates" className={styles.tabContent}>
        <p>[Duplicate detection component placeholder]</p>
      </div>

      <div id="overview" className={styles.tabContent}>
        {generateBreakdown()}
      </div>
    </div>
  );
}

// Simple tab toggler
function showTab(id) {
  document.querySelectorAll(`.${styles.tabContent}`).forEach(el => el.classList.remove(styles.active));
  document.getElementById(id)?.classList.add(styles.active);
}

export default ActionPlanReport;
