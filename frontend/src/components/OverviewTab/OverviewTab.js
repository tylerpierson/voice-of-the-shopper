import { useEffect, useState } from "react";
import styles from "./OverviewTab.module.scss";
import Chart from "chart.js/auto";

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

function OverviewTab() {
  const [sentimentData, setSentimentData] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [days, setDays] = useState(30);
  const [activeChart, setActiveChart] = useState("bar");
  const [selectedCategory, setSelectedCategory] = useState("View All");
  const [loading, setLoading] = useState(false);
  const [fetchedCategories, setFetchedCategories] = useState(new Set());

  useEffect(() => {
    fetch("http://localhost:8000/get-summaries")
      .then((res) => res.json())
      .then(setSummaries)
      .catch(console.error);
  }, []);

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
        setFetchedCategories(prev => new Set(prev).add(selectedCategory));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategory, days, fetchedCategories]);

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
          return match ? [match.positive, match.negative] : [0, 0, 0];
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
              labels: { font: { size: 10 }, boxWidth: 10 }
            }
          }
        }
      });
    }

    if (activeChart === "bar" && barCtx) {
      if (selectedCategory === "View All") {
        window.sentimentChart = new Chart(barCtx, {
          type: "bar",
          data: {
            labels: filteredData.map((s) => s.department),
            datasets: [
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
          },
          options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true }
            }
          }
        });
      } else {
        const cat = filteredData[0] || { positive: 0, negative: 0 };
        window.sentimentChart = new Chart(barCtx, {
          type: "bar",
          data: {
            labels: ["Positive", "Negative"],
            datasets: [
              {
                label: selectedCategory,
                data: [cat.positive, cat.negative],
                backgroundColor: ["#4CAF50", "#F44336"]
              }
            ]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
      }
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

  const topPositiveCategories = [...sentimentData]
    .sort((a, b) => b.positive_pct - a.positive_pct)
    .slice(0, 3);

  const topNegativeCategories = [...sentimentData]
    .sort((a, b) => b.negative_pct - a.negative_pct)
    .slice(0, 3);

  const filteredSummaries = summaries.filter((s) =>
    selectedCategory === "View All" ? false : s.department === selectedCategory
  );

  const topPositiveSummaries = filteredSummaries
    .filter((s) => s.sentiment.toLowerCase() === "positive")
    .slice(0, 3);

  const topNegativeSummaries = filteredSummaries
    .filter((s) => s.sentiment.toLowerCase() === "negative")
    .slice(0, 3);

  return (
    <div className={styles.container}>
      <h2>Sentiment Overview</h2>

      <div className={styles.controls}>
        <label>Timeframe:</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>

        <label>Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {selectedCategory && (
          <>
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
            <button onClick={downloadCSV}>📄 Export CSV</button>
          </>
        )}
      </div>

      {loading && <p className={styles.loading}>Loading data...</p>}

      {!loading && selectedCategory && filteredData.length > 0 && (
        <>
          <div className={styles.chartContainer}>
            {activeChart === "bar" && <canvas id="sentimentBarChart" />}
            {activeChart === "pie" && <canvas id="sentimentPieChart" className={styles.pieChart} />}
          </div>

          <div className={styles.breakdownSection}>
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
        </>
      )}
    </div>
  );
}

export default OverviewTab;
