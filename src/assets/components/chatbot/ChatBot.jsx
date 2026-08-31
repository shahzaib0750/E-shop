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
            const response = await apiFetch("/chatbot/stream", {
                method: "POST",
                body: JSON.stringify({
                    message: text
                })
            });

            if (!response.ok) {
                let errorMessage = "Request failed.";

                try {
                    const data = await response.json();
                    errorMessage = data.detail || errorMessage;
                } catch {
                    // Ignore JSON parsing error
                }

                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error("Streaming is not supported by this response.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let botResponse = "";

            while (true) {
                const { value, done } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, {
                    stream: true
                });

                botResponse += chunk;

                setMessages((prev) => {
                    const updated = [...prev];

                    updated[updated.length - 1] = {
                        sender: "bot",
                        text: botResponse
                    };

                    return updated;
                });
            }

            const finalChunk = decoder.decode();

            if (finalChunk) {
                botResponse += finalChunk;

                setMessages((prev) => {
                    const updated = [...prev];

                    updated[updated.length - 1] = {
                        sender: "bot",
                        text: botResponse
                    };

                    return updated;
                });
            }

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
            >
                {open ? <FaTimes /> : <FaRobot />}
            </button>

            {open && (
                <div className="chat-window">

                    <div className="chat-header">
                        🤖 AI Shopping Assistant
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