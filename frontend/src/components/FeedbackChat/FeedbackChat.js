import { useState } from "react";
import style from "./FeedbackChat.module.scss";
import ChatMessage from "../ChatMessage/ChatMessage";

const categories = [
  "Taste", "Packaging", "Price", "Availability",
  "Store Experience", "Promotions", "Sustainability", "Family-Friendliness"
];

function FeedbackChat({ toggleAdmin }) {
  const [messages, setMessages] = useState([
    { sender: "assistant", text: "👋 Hi there! Please select a category and tell me about your experience." }
  ]);
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const sendMessage = async (text) => {
    const newMessages = [...messages, { sender: "user", text }];
    setMessages(newMessages);
    setInput("");

    const body = { message: text };
    if (sessionId) body.session_id = sessionId;
    if (selectedCategory) body.category = selectedCategory;

    try {
      const response = await fetch("http://localhost:8000/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      setSessionId(data.session_id);
      setMessages((prev) => [...prev, { sender: "assistant", text: data.bot_reply }]);
    } catch (error) {
      console.error("Failed to send feedback:", error);
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    const intro = `I'd like to give feedback about ${cat.toLowerCase()}.`;
    sendMessage(intro);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
  };

  const finalizeFeedback = async () => {
    if (!sessionId) return;
    try {
      const response = await fetch(`http://localhost:8000/finalize-summary/${sessionId}`, {
        method: "POST",
      });
      const data = await response.json();
      alert("✅ Feedback finalized and saved!");
    } catch (error) {
      console.error("Finalization error:", error);
      alert("❌ Failed to finalize feedback.");
    }
  };

  return (
    <div className={style.container}>
      <h2>Feedback Assistant</h2>

      {!selectedCategory && (
        <div className={style.categoryButtons}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => handleCategorySelect(cat)} className={style.categoryButton}>
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className={style.chatBox}>
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} sender={msg.sender} text={msg.text} />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={!selectedCategory}
        />
        <button type="submit" className={style.sendButton} disabled={!selectedCategory || !input.trim()}>
          Send
        </button>
      </form>

      <button
        onClick={async () => {
          await finalizeFeedback();
          toggleAdmin();
        }}
        className={style.toggleButton}
      >
        Go to Admin Dashboard
      </button>

      <button
        className={style.finishButton}
        onClick={finalizeFeedback}
      >
        Finish Feedback
      </button>
    </div>
  );
}

export default FeedbackChat;
