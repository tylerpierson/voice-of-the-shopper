import { useState } from "react";
import styles from "./ProgressiveOnboarding.module.scss";

function ProgressiveOnboarding({ onFinish }) {
  const steps = [
    {
      title: "Welcome!",
      content: "We appreciate your time. Your feedback helps improve the shopper experience.",
    },
    {
      title: "How it works",
      content: "You'll chat with our assistant to share your experience. It'll take less than 2 minutes!",
    },
    {
        title: "Please Submit",
        content: "When you feel you have gotten your point across, please press the \"Finish Feedback\" button to save your response!",
      },
    {
      title: "Ready?",
      content: "Let's get started with your feedback.",
    },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onFinish(); // Signal onboarding is complete
    }
  };

  return (
    <div className={styles.onboardingContainer}>
      <div className={styles.card}>
        <h2>{steps[currentStep].title}</h2>
        <p>{steps[currentStep].content}</p>
        <button className={styles.button} onClick={nextStep}>
          {currentStep < steps.length - 1 ? "Next" : "Start"}
        </button>
      </div>
    </div>
  );
}

export default ProgressiveOnboarding;
