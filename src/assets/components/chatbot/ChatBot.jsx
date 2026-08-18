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

        if (!text.trim()) return;

        const userMessage = {
            sender: "user",
            text: text
        };

        setMessages(prev => [...prev, userMessage]);

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

                throw new Error(
                    data.detail || "Request failed."
                );

            }

            setMessages(prev => [
                ...prev,
                {
                    sender: "bot",
                    text: data.reply
                }
            ]);

        } catch (error) {

            console.error(error);

            setMessages(prev => [
                ...prev,
                {
                    sender: "bot",
                    text: "❌ " + error.message
                }
            ]);

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

                        {loading && (

                            <ChatMessage
                                message={{
                                    sender: "bot",
                                    text: "Thinking..."
                                }}
                            />

                        )}

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