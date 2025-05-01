import { useEffect, useState } from "react";
import styles from "./ActionPlan.module.scss";
import ImpactAssessment from "../ImpactAssessment/ImpactAssessment";

function ActionPlan({ sessionId }) {
  const [steps, setSteps] = useState([]);
  const [impactEffortMap, setImpactEffortMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:8000/generate-action-plan/${sessionId}`);
        const data = await res.json();
        const planText = data.action_plan || "";

        // Split into individual steps
        const stepLines = planText
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0 && /[a-zA-Z]/.test(line));

        setSteps(stepLines);

        // Assess each step
        stepLines.forEach(async (step, idx) => {
          const [impactRes, effortRes] = await Promise.all([
            fetch("http://localhost:8000/assess-impact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action_plan: step }),
            }).then(r => r.json()),
            fetch("http://localhost:8000/assess-effort", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action_plan: step }),
            }).then(r => r.json()),
          ]);

          setImpactEffortMap(prev => ({
            ...prev,
            [idx]: {
              impact: impactRes.impact,
              effort: effortRes.effort,
            }
          }));
        });

        setLoading(false);
      } catch (err) {
        console.error("Failed to load action plan:", err);
        setLoading(false);
      }
    }

    fetchData();
  }, [sessionId]);

  const toggleExpand = () => {
    setExpanded(prev => !prev);
  };

  if (loading) return <p className={styles.loading}>Generating action plan...</p>;
  if (!steps.length) return null;

  return (
    <div className={`${styles.actionPlanCard} ${expanded ? styles.expanded : ""}`}>
      <button className={styles.expandButton} onClick={toggleExpand}>
        {expanded ? "Collapse" : "Expand"}
      </button>
      <h3>AI-Generated Action Plan</h3>

      <ul>
        {steps.map((step, idx) => (
          <li key={idx}>
            <p>{step}</p>
            <div className={styles.metaInfo}>
              <span className={styles.metaTag}>Impact: {impactEffortMap[idx]?.impact || "..."}</span>
              <span className={styles.metaTag}>Effort: {impactEffortMap[idx]?.effort || "..."}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ActionPlan;
