import "./ChatBot.css";
import { useState } from "react";
import { FaRobot, FaTimes } from "react-icons/fa";
import { apiFetch } from "../../../api/api";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

function ChatBot() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "👋 Hello! I'm your AI shopping assistant. How can I help you today?"
        }
    ]);

    const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    setMessages((prev) => [
        ...prev,
        {
            sender: "user",
            text
        },
        {
            sender: "bot",
            text: ""
        }
    ]);

    setLoading(true);

    try {
        const response = await apiFetch("/chatbot", {
            method: "POST",
            body: JSON.stringify({
                message: text
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Request failed.");
        }

        setMessages((prev) => {
            const updated = [...prev];

            updated[updated.length - 1] = {
                sender: "bot",
                text: data.reply
            };

            return updated;
        });

    } catch (error) {
        console.error("Chatbot error:", error);

        setMessages((prev) => {
            const updated = [...prev];

            updated[updated.length - 1] = {
                sender: "bot",
                text: "❌ " + error.message
            };

            return updated;
        });
    } finally {
        setLoading(false);
    }
};
    return (
        <>
            <button
    className="chat-toggle"
    onClick={() => setOpen(!open)}
    aria-label={open ? "Close chat" : "Open chat"}
>
    {open ? <FaTimes /> : <FaRobot />}
</button>
            {open && (
                <div className="chat-window">

                    <div className="chat-header">
    <div className="chat-header-icon">
        <FaRobot />
    </div>

    <div className="chat-header-content">
        <strong>AI Shopping Assistant</strong>
    
    </div>
</div>

                    <div className="chat-body">
                        {messages.map((msg, index) => (
                            <ChatMessage
                                key={index}
                                message={msg}
                            />
                        ))}
                    </div>

                    <ChatInput
                        onSend={sendMessage}
                        disabled={loading}
                    />

                </div>
            )}
        </>
    );
}

export default ChatBot;