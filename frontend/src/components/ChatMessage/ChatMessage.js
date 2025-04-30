import style from "./ChatMessage.module.scss";

function ChatMessage({ sender, text }) {
  const isUser = sender === "user";
  return (
    <div className={`${style.messageContainer} ${isUser ? style.user : style.assistant}`}>
      <div className={`${style.bubble} ${isUser ? style.userBubble : style.assistantBubble}`}>
        {text}
      </div>
    </div>
  );
}

export default ChatMessage;
