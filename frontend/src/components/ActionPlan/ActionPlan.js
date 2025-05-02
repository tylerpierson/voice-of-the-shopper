import { useEffect, useState } from "react";
import styles from "./ActionPlan.module.scss";

function ActionPlan({ sessionId, category, summaries = [], onClose }) {
  const [steps, setSteps] = useState([]);
  const [impactEffortMap, setImpactEffortMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [reportReady, setReportReady] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          sessionId
            ? `http://localhost:8000/generate-action-plan/${sessionId}`
            : "http://localhost:8000/generate-category-action-plan",
          {
            method: sessionId ? "GET" : "POST",
            headers: { "Content-Type": "application/json" },
            body: sessionId ? null : JSON.stringify({ category }),
          }
        );
        const data = await res.json();
        const planText = data.action_plan || "";

        const stepLines = planText
        .split("\n")
        .map((line) => line.trim().replace(/\s*\(Feeds #[^)]+\)\s*$/, "")) // removes (Feeds #...) at the end
        .filter((line) => line.length > 0 && /[a-zA-Z]/.test(line))
        .slice(0, 5);
      

        setSteps(stepLines);

        stepLines.forEach(async (step, idx) => {
          const [impactRes, effortRes] = await Promise.all([
            fetch("http://localhost:8000/assess-impact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action_plan: step }),
            }).then((r) => r.json()),
            fetch("http://localhost:8000/assess-effort", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action_plan: step }),
            }).then((r) => r.json()),
          ]);

          setImpactEffortMap((prev) => ({
            ...prev,
            [idx]: {
              impact: impactRes.impact,
              effort: effortRes.effort,
            },
          }));
        });

        setReportReady(true);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load action plan:", err);
        setLoading(false);
      }
    }

    fetchData();
  }, [sessionId || "", category || ""]);

  const openReport = () => {
    const breakdown = summaries.reduce((acc, cur) => {
      acc[cur.department] = (acc[cur.department] || 0) + 1;
      return acc;
    }, {});
  
    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);
    const total = values.reduce((a, b) => a + b, 0);
    const labelsWithCounts = labels.map((label, i) => `${label} (${values[i]})`);
  
    // Top 3 categories
    const sorted = [...labels].map((label, i) => ({
      label,
      count: values[i],
      percentage: ((values[i] / total) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count).slice(0, 3);
  
    const newTab = window.open();
    const reportHTML = `
      <html>
        <head>
          <title>Action Plan Report</title>
          <link rel="icon" href="${window.location.origin}/img/vos_favicon.png" />
          <style>
            body { font-family: sans-serif; padding: 2rem; }
            .tabs { display: flex; gap: 1rem; margin-bottom: 1rem; }
            .tab { cursor: pointer; padding: 0.5rem 1rem; background: #eee; border-radius: 5px; }
            .tab:hover { background: #ddd; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <script>
            function showTab(id) {
              document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
              document.getElementById(id).classList.add('active');
            }
  
            window.onload = function () {
              const ctx = document.getElementById('categoryPieChart')?.getContext('2d');
              if (ctx) {
                new Chart(ctx, {
                  type: 'pie',
                  data: {
                    labels: ${JSON.stringify(labelsWithCounts)},
                    datasets: [{
                      data: ${JSON.stringify(values)},
                      backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#8BC34A',
                        '#FF9800', '#9C27B0', '#00BCD4', '#E91E63'
                      ]
                    }]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: 0
                    },
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          boxWidth: 10,
                          font: {
                            size: 10
                          }
                        }
                      }
                    }
                  }
                });
              }
            }
          </script>
        </head>
        <body>
          <h2>Action Plan</h2>
          ${category ? `<p><strong>Category:</strong> ${category}</p>` : ""}
          <div class="tabs">
            <div class="tab" onclick="showTab('action-plan')">Action Plan</div>
            <div class="tab" onclick="showTab('duplicates')">Duplicates</div>
            <div class="tab" onclick="showTab('overview')">Overview</div>
          </div>
  
          <div id="action-plan" class="tab-content active">
            <ol>
            ${steps.map((step, idx) => {
                const cleanStep = step.replace(/^(\d+[\.\)]|\-)\s*/, "");
                const relatedDept = category === "View All"
                ? `<p><strong>Related Category:</strong> ${summaries[idx]?.department || "Unknown"}</p>`
                : "";
                return `
                <li>
                    <p>${cleanStep}</p>
                    ${relatedDept}
                    <p><strong>Impact:</strong> ${impactEffortMap[idx]?.impact || "..."}</p>
                    <p><strong>Effort:</strong> ${impactEffortMap[idx]?.effort || "..."}</p>
                </li>
                `;
            }).join("")}
            </ol>
          </div>
            <div id="duplicates" class="tab-content">
            <p>Detecting duplicate feedback summaries...</p>
            <script>
                async function loadDuplicates() {
                const res = await fetch("http://localhost:8000/find-duplicates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ category: ${JSON.stringify(category)} })
                });

                const data = await res.json();
                const container = document.getElementById("duplicates");
                container.innerHTML = "";

                if (!data.groups || data.groups.length === 0) {
                    container.innerHTML = "<p>No duplicate summaries found.</p>";
                    return;
                }

                data.groups.forEach((group, idx) => {
                    const groupBox = document.createElement("details");
                    groupBox.style.marginBottom = "1rem";
                    groupBox.open = false;

                    const summary = document.createElement("summary");
                    summary.innerText = \`Group \${idx + 1} — \${group.length} similar summaries\`;
                    groupBox.appendChild(summary);

                    const list = document.createElement("ul");
                    group.forEach((item) => {
                    const li = document.createElement("li");
                    const a = document.createElement("a");
                    a.href = \`/conversation/\${item.session_id}\`;
                    a.target = "_blank";
                    a.innerText = item.summary + (item.department ? \` [\${item.department}]\` : "");
                    li.appendChild(a);
                    list.appendChild(li);
                    });

                    groupBox.appendChild(list);
                    container.appendChild(groupBox);
                });
                }

                window.onload = function () {
                showTab('action-plan'); // default
                loadDuplicates(); // now included
                const ctx = document.getElementById('categoryPieChart')?.getContext('2d');
                if (ctx) {
                    new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ${JSON.stringify(labelsWithCounts)},
                        datasets: [{
                        data: ${JSON.stringify(values)},
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#8BC34A',
                            '#FF9800', '#9C27B0', '#00BCD4', '#E91E63'
                        ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: 0 },
                        plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                            boxWidth: 10,
                            font: { size: 10 }
                            }
                        }
                        }
                    }
                    });
                }
                };
            </script>
            </div>
  
          <div id="overview" class="tab-content">
            <h4>Summary Breakdown by Category</h4>
            <canvas id="categoryPieChart" width="400" height="400" style="max-width: 400px; max-height: 400px;"></canvas>
  
            <h4>Total Feedback Summaries: ${total}</h4>
            <ul>
              ${labels.map((label, i) => {
                const count = values[i];
                const percent = ((count / total) * 100).toFixed(1);
                return `<li>${label}: ${count} summaries (${percent}%)</li>`;
              }).join("")}
            </ul>
  
            <h4>Top 3 Feedback Categories</h4>
            <ol>
              ${sorted.map(({ label, count, percentage }) => `<li>${label}: ${count} (${percentage}%)</li>`).join("")}
            </ol>
          </div>
        </body>
      </html>
    `;
    newTab.document.write(reportHTML);
    newTab.document.close();
  };  

  if (loading) return <p className={styles.loading}>Generating Report...</p>;
  if (!steps.length || !reportReady) return null;

  return (
    <div className={styles.reportReadyLinkContainer}>
      <button className={styles.openReportLink} onClick={openReport}>
        View Generated Action Plan
      </button>
    </div>
  );
}

export default ActionPlan;
