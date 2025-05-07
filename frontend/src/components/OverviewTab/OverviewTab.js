import { useEffect, useState } from "react";
import styles from "./OverviewTab.module.scss";
import Chart from "chart.js/auto";
import { FaSpinner } from "react-icons/fa";

const categories = [
  "View All",
  "Taste",
  "Packaging",
  "Price",
  "Availability",
  "Store Experience",
  "Promotions",
  "Sustainability",
  "Family-Friendliness"
];

function OverviewTab({ summaries, overviewCache, setOverviewCache }) {
  const [sentimentData, setSentimentData] = useState(overviewCache?.sentimentData || []);
  const [days, setDays] = useState(30);
  const [activeChart, setActiveChart] = useState("bar");
  const [selectedCategory, setSelectedCategory] = useState("View All");
  const [loading, setLoading] = useState(false);
  const [fetchedCategories, setFetchedCategories] = useState(new Set());

  useEffect(() => {
    if (!overviewCache?.summaries) {
      fetch("http://localhost:8000/get-summaries")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setOverviewCache(prev => ({ ...prev, summaries: data }));
          } else {
            console.error("Unexpected response:", data);
          }
        })
        .catch((err) => console.error("Failed to fetch summaries:", err));
    }
  }, [overviewCache, setOverviewCache]);

  useEffect(() => {
    if (!selectedCategory || fetchedCategories.has(selectedCategory)) return;

    setLoading(true);
    fetch(`http://localhost:8000/sentiment-breakdown?days=${days}`)
      .then((res) => res.json())
      .then((data) => {
        const formatted = Object.entries(data).map(([department, counts]) => {
          const total = counts.positive + counts.negative;
          return {
            department,
            ...counts,
            total,
            positive_pct: total ? (counts.positive / total * 100).toFixed(1) : 0,
            negative_pct: total ? (counts.negative / total * 100).toFixed(1) : 0,
          };
        });
        setSentimentData(formatted);
        setOverviewCache(prev => ({ ...prev, sentimentData: formatted }));
        setFetchedCategories(prev => new Set(prev).add(selectedCategory));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, days, fetchedCategories, setOverviewCache]);

  const filteredData =
    selectedCategory === "View All"
      ? sentimentData
      : sentimentData.filter((row) => row.department === selectedCategory);

  const chartLabels =
    selectedCategory === "View All"
      ? filteredData.map((s) => s.department)
      : ["Positive", "Negative"];

  const chartValues =
    selectedCategory === "View All"
      ? filteredData.map((s) => s.total)
      : (() => {
          const match = filteredData[0];
          return match ? [match.positive, match.negative] : [0, 0];
        })();

  useEffect(() => {
    if (!filteredData.length) return;

    const pieCtx = document.getElementById("sentimentPieChart")?.getContext("2d");
    const barCtx = document.getElementById("sentimentBarChart")?.getContext("2d");

    if (window.sentimentChart) window.sentimentChart.destroy();

    if (activeChart === "pie" && pieCtx) {
      window.sentimentChart = new Chart(pieCtx, {
        type: "pie",
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartValues,
            backgroundColor: [
              "#36A2EB", "#FF6384", "#FFCE56", "#8BC34A",
              "#FF9800", "#9C27B0", "#00BCD4", "#E91E63"
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: { font: { size: 18 }, boxWidth: 18 }
            }
          }
        }
      });
    }

    if (activeChart === "bar" && barCtx) {
      const datasets =
        selectedCategory === "View All"
          ? [
              {
                label: "Positive",
                data: filteredData.map((s) => s.positive),
                backgroundColor: "#4CAF50"
              },
              {
                label: "Negative",
                data: filteredData.map((s) => s.negative),
                backgroundColor: "#F44336"
              }
            ]
          : [
              {
                label: selectedCategory,
                data: [filteredData[0]?.positive || 0, filteredData[0]?.negative || 0],
                backgroundColor: ["#4CAF50", "#F44336"]
              }
            ];
    
      const chartLabels = selectedCategory === "View All"
        ? filteredData.map((s) =>
            s.department.includes(" ")
              ? s.department.replace(/\s+/g, "\n")
              : s.department
          )
        : ["Positive", "Negative"];
    
      window.sentimentChart = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                title: (tooltipItems) => tooltipItems[0].label
              }
            }
          },
          scales: {
            x: {
              ticks: {
                autoSkip: false,
                maxRotation: 45,
                minRotation: 0,
                font: { size: 12 },
                callback: function (value, index, values) {
                  const label = this.getLabelForValue(value);
                  return label.split('\n');
                }
              }
            },
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }       
  }, [filteredData, activeChart, selectedCategory]);

  const downloadCSV = () => {
    if (!filteredData.length) return;

    const headers = [
      "Department", "Positive", "Negative",
      "Total", "Positive %", "Negative %"
    ];

    const rows = filteredData.map(row => [
      row.department,
      row.positive,
      row.negative,
      row.total,
      row.positive_pct,
      row.negative_pct
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sentiment_summary_${days}d_${selectedCategory}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summariesFromCache = overviewCache?.summaries || [];

  const topPositiveCategories = [...sentimentData]
    .sort((a, b) => b.positive_pct - a.positive_pct)
    .slice(0, 3);

  const topNegativeCategories = [...sentimentData]
    .sort((a, b) => b.negative_pct - a.negative_pct)
    .slice(0, 3);

  const filteredSummaries = summariesFromCache.filter((s) =>
    selectedCategory === "View All" ? false : s.department === selectedCategory
  );

  const topPositiveSummaries = filteredSummaries
    .filter((s) => s.sentiment.toLowerCase() === "positive")
    .slice(0, 3);

  const topNegativeSummaries = filteredSummaries
    .filter((s) => s.sentiment.toLowerCase() === "negative")
    .slice(0, 3);

  const totalPositive = sentimentData.reduce((a, b) => a + b.positive, 0);
  const totalNegative = sentimentData.reduce((a, b) => a + b.negative, 0);

  return (
    <div className={styles.container}>
      <div className={styles.exportContainer}>
        <button onClick={downloadCSV}>📄 Export CSV</button>
      </div>

      <div className={styles.controls}>
        <label title="Choose how far back to analyze feedback">Timeframe:</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>

        <label title="Filter by product or service category">Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div className={styles.chartTabs}>
          <button
            className={activeChart === "bar" ? styles.activeTab : ""}
            onClick={() => setActiveChart("bar")}
          >
            Sentiment Breakdown
          </button>
          <button
            className={activeChart === "pie" ? styles.activeTab : ""}
            onClick={() => setActiveChart("pie")}
          >
            Pie View
          </button>
        </div>
      </div>

      {loading && (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p className={styles.loading}>Loading data...</p>
        </div>
      )}

      {!loading && selectedCategory && filteredData.length > 0 && (
        <div className={styles.contentWrapper}>
          <div className={styles.breakdownSection}>
            {selectedCategory === "View All" ? (
              <div className={styles.metricsBox}>
                <h3>📊 Overall Feedback Summary</h3>
                <ul>
                  <li><strong>Total:</strong> {summariesFromCache.length}</li>
                  <li><strong>Positive:</strong> {totalPositive}</li>
                  <li><strong>Negative:</strong> {totalNegative}</li>
                </ul>
              </div>
            ) : (
              <div className={styles.metricsBox}>
                <h3>📊 Feedback Summary ({selectedCategory})</h3>
                <ul>
                  <li><strong>Total:</strong> {filteredSummaries.length}</li>
                  <li><strong>Positive:</strong> {topPositiveSummaries.length}</li>
                  <li><strong>Negative:</strong> {topNegativeSummaries.length}</li>
                </ul>
              </div>
            )}

            {selectedCategory === "View All" ? (
              <>
                <h3>📈 Top Positive Categories</h3>
                <ul>{topPositiveCategories.map((c, i) => <li key={i}>{c.department} — {c.positive_pct}%</li>)}</ul>
                <h3>📉 Categories Needing Improvement</h3>
                <ul>{topNegativeCategories.map((c, i) => <li key={i}>{c.department} — {c.negative_pct}%</li>)}</ul>
              </>
            ) : (
              <>
                <h3>📈 Most Positive Feedback ({selectedCategory})</h3>
                {topPositiveSummaries.length === 0 ? (
                  <p>No positive feedback found.</p>
                ) : (
                  <ul>{topPositiveSummaries.map((s, idx) => <li key={idx}>{s.summary}</li>)}</ul>
                )}

                <h3>📉 Areas Needing Improvement ({selectedCategory})</h3>
                {topNegativeSummaries.length === 0 ? (
                  <p>No negative feedback found.</p>
                ) : (
                  <ul>{topNegativeSummaries.map((s, idx) => <li key={idx}>{s.summary}</li>)}</ul>
                )}
              </>
            )}
          </div>

          <div className={styles.chartContainer}>
            {activeChart === "bar" && <canvas id="sentimentBarChart" />}
            {activeChart === "pie" && <canvas id="sentimentPieChart" className={styles.pieChart} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewTab;
