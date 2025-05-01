import { useEffect, useState } from "react";
import styles from "./ImpactAssessment.module.scss";

function ImpactAssessment({ actionPlan }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Split action plan into steps — change logic here if needed
  const steps = actionPlan
    .split(/[\n•-]/) // splits by bullet or new line
    .map(s => s.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!steps.length) return;

    const fetchAssessments = async () => {
      const results = await Promise.all(
        steps.map(async (step) => {
          try {
            const res = await fetch("http://localhost:8000/assess-impact-effort", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action_plan: step })
            });
            const data = await res.json();
            return { step, impact: data.impact, effort: data.effort };
          } catch {
            return { step, impact: "Unknown", effort: "Unknown" };
          }
        })
      );
      setAssessments(results);
      setLoading(false);
    };

    fetchAssessments();
  }, [actionPlan]);

  if (loading) return <p className={styles.loading}>Assessing each action item...</p>;

  return (
    <ul className={styles.assessmentList}>
      {assessments.map(({ step, impact, effort }, idx) => (
        <li key={idx} className={styles.item}>
          <p className={styles.stepText}>{step}</p>
          <p className={styles.meta}>
            <strong>Impact:</strong> {impact} | <strong>Effort:</strong> {effort}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default ImpactAssessment;
