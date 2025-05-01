import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./ConversationPage.module.scss";
import ActionPlan from "../../components/ActionPlan/ActionPlan";

function ConversationPage() {
  const { sessionId } = useParams();
  const [conversation, setConversation] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:8000/conversation/${sessionId}`)
      .then(res => res.json())
      .then(setConversation)
      .catch(console.error);
  }, [sessionId]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <h2 className={styles.title}>Conversation Details</h2>
  
        <div className={styles.chatScrollArea}>
          <div className={styles.chatBox}>
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`${styles.message} ${msg.role === "user" ? styles.user : styles.assistant}`}
              >
                <div className={styles.bubble}>
                  <span className={styles.role}>
                    {msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}:
                  </span>
                  <p>{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  
      <div className={styles.actionPlanContainer}>
        <ActionPlan sessionId={sessionId} />
      </div>
    </div>
  );  
}

export default ConversationPage;
