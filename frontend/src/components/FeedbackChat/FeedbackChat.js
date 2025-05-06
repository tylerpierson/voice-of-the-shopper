import { useEffect, useRef, useState } from "react";
import style from "./FeedbackChat.module.scss";
import ChatMessage from "../ChatMessage/ChatMessage";
import Confetti from "react-confetti";
import VoiceInput from '../VoiceInput/VoiceInput';
import MapPopup from "../MapPopup/MapPopup";
import { FaLocationDot } from 'react-icons/fa6'; // for Font Awesome 6+ location dot

const categories = [
  "Taste", "Packaging", "Price", "Availability",
  "Store Experience", "Promotions", "Sustainability", "Family-Friendliness"
];

const categoryPrompts = {
  Taste: ["The flavor was great!", "It was too salty.", "Loved the freshness.", "Could be more seasoned."],
  Packaging: ["The box was damaged.", "Loved the eco-friendly packaging.", "Too much plastic.", "Easy to open."],
  Price: ["Great value for money.", "Too expensive.", "Affordable and worth it.", "Could be cheaper."],
  Availability: ["Item was out of stock.", "Easy to find.", "Not available in my area.", "Restocked quickly."],
  "Store Experience": ["Helpful staff.", "Checkout took too long.", "Store was clean.", "Great atmosphere."],
  Promotions: ["Good deals available.", "Promo was unclear.", "Loved the discount.", "Offer expired too quickly."],
  Sustainability: ["Love the eco-focus.", "Could use less plastic.", "Sustainable options are great.", "More green products please."],
  "Family-Friendliness": ["Kids loved it!", "Great for families.", "Not suitable for children.", "Fun for all ages."]
};

function FeedbackChat({ toggleAdmin, userName, setUserName }) {
  const [transcript, setTranscript] = useState('');
  // const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState([
    { sender: "assistant", text: "👋 Hi there! Please select a category and tell me about your experience." }
  ]);
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tempNameInput, setTempNameInput] = useState("");
  const[placeholder,setPlaceholder] = useState('Type or click mic to speak...');
  const [showMap, setShowMap] = useState(false);
  const defaultPosition = { lat: 40.7128, lng: -74.006 };
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 40.7128,
    lng: -74.006,
    address: '',
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handlePromptSelect = (prompt) => {
    sendMessage(prompt);
  };

  const sendMessage = async (text) => {
    const newMessages = [...messages, { sender: "user", text }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    const body = {
      message: text,
      user_name: userName,
      session_id: sessionId,
      category: selectedCategory
    };

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
    } finally {
      setIsTyping(false);
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    sendMessage(`I'd like to give feedback about ${cat.toLowerCase()}.`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
    setInput('')
  };
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Handles updates from speech input
  const handleSpeechInput = (speechText) => {
    setInput((prevText) => prevText + ' ' + speechText);
  };

  const onPlaceHolderChange =(text) =>{
    setPlaceholder(text)
  }

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    // This is the parent function that updates the location
    // Close the map when the address is selected
    setShowMap(false);
  };

  const finalizeFeedback = async () => {
    try {
      await fetch(`http://localhost:8000/finalize-summary/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: userName?.trim() || "Anonymous",
          category: selectedCategory
        })
      });

      setShowConfetti(true);
      setTimeout(() => setShowThankYou(true), 1500);
    } catch (error) {
      console.error("Finalization error:", error);
      alert("❌ Failed to finalize feedback.");
    }
  };

  const resetToStart = () => {
    setMessages([
      { sender: "assistant", text: "👋 Hi there! Please select a category and tell me about your experience." }
    ]);
    setInput("");
    setSelectedCategory(null);
    setSessionId(null);
    setIsTyping(false);
    setShowThankYou(false);
    setShowConfetti(false);
    setTempNameInput("");
  };

  if (showThankYou) {
    const handleNameSubmit = async () => {
      const trimmed = tempNameInput.trim();
      if (!trimmed) {
        alert("⚠️ Please enter a name before submitting.");
        return;
      }

      try {
        const res = await fetch(`http://localhost:8000/update-user-name/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_name: trimmed })
        });

        if (res.ok) {
          setUserName(trimmed);
          alert("✅ Name updated successfully.");
        } else {
          alert("❌ Failed to update name.");
        }
      } catch (err) {
        console.error("Error updating name:", err);
        alert("❌ Network error updating name.");
      }
    };

    return (
      <div className={style.container}>
        {showConfetti && <Confetti numberOfPieces={250} recycle={false} />}
        <div className={style.thankYouCard}>
          <h2>🎉 Thank you for your input!</h2>
          <p>We truly appreciate your feedback.</p>

          <div className={style.nameInputRow}>
            <input
              type="text"
              placeholder="Enter your name (optional)"
              value={tempNameInput}
              onChange={(e) => setTempNameInput(e.target.value)}
              className={style.nameInput}
            />
            <button onClick={handleNameSubmit} className={style.submitButton}>
              Submit Name
            </button>
          </div>

          <button onClick={resetToStart} className={style.finishButton}>
            Leave More Feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={style.container}>
      <h2>Feedback Assistant</h2>
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={style['plusCircleButton']}
            onClick={() => setShowMap(true)}
            title="Select Location"
            onMouseEnter={(e) => {
              const tooltip = document.createElement('div');
              tooltip.textContent = "Click to select a location on the map";
              tooltip.style.position = 'absolute';
              tooltip.style.backgroundColor = '#333';
              tooltip.style.color = '#fff';
              tooltip.style.padding = '5px';
              tooltip.style.borderRadius = '5px';
              tooltip.style.fontSize = '12px';
              tooltip.style.top = `${e.clientY + 10}px`;
              tooltip.style.left = `${e.clientX + 10}px`;
              tooltip.style.zIndex = '1000';
              tooltip.className = 'custom-tooltip';
              document.body.appendChild(tooltip);
            }}
            onMouseLeave={() => {
              const tooltip = document.querySelector('.custom-tooltip');
              if (tooltip) {
                tooltip.remove();
              }
            }}
          >
          <FaLocationDot size={20} />
          </button>
          <span style={{ fontWeight: 'bold', color: 'blue' }}></span>
            {selectedLocation.address ? `${selectedLocation.address}` : ''}         
        </div>
        {showMap && (
          <div className={style.mapOverlay}>
            <div className={style.mapPopup}>
              <MapPopup
                show={showMap}
                onClose={() => setShowMap(false)}
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                onLocationSelect={handleLocationSelect}
                draggable={true}
              />
            </div>
          </div>
        )}
      </div>

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
        {isTyping && <ChatMessage sender="assistant" text={<TypingDots />} />}
        <div ref={chatEndRef} />
      </div>

      {selectedCategory && categoryPrompts[selectedCategory] && (
        <div className={style.prompts}>
          {categoryPrompts[selectedCategory].map((prompt, index) => (
            <button
              key={index}
              className={style.promptButton}
              onClick={() => handlePromptSelect(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className={style.inputForm}>
      <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder= {placeholder}
          disabled={!selectedCategory}
        />
        <VoiceInput onSpeechResult={handleSpeechInput} handlePlaceHolder={onPlaceHolderChange} /> {/* Pass the function as a prop */}
        <button type="submit" className={style.sendButton} disabled={!selectedCategory || !input.trim()}>
          Send
        </button>
      </form>

      <button onClick={finalizeFeedback} className={style.finishButton}>
        Finish Feedback
      </button>
    </div>
  );
}

function TypingDots() {
  const message = "Assistant is typing";

  return (
    <div className={style.typingWrapper}>
      {message.split("").map((char, i) => (
        <span
          key={i}
          className={style.typingChar}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
      <span className={style.typingDots}>
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </div>
  );
}

export default FeedbackChat;
