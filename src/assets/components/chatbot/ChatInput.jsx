import { useState } from "react";

function ChatInput({ onSend, disabled = false }) {
    const [text, setText] = useState("");

    const handleSend = () => {
        if (disabled || !text.trim()) return;

        onSend(text);
        setText("");
    };

    return (
        <div className="chat-input">
            <input
                type="text"
                placeholder="Ask me anything..."
                value={text}
                disabled={disabled}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        handleSend();
                    }
                }}
            />

            <button
                onClick={handleSend}
                disabled={disabled}
            >
                {disabled ? "..." : "Send"}
            </button>
        </div>
    );
}

export default ChatInput;