import { useState } from "react";

function ChatInput({ onSend }) {

    const [text, setText] = useState("");

    const handleSend = () => {

        if (!text.trim()) return;

        onSend(text);

        setText("");

    };

    return (

        <div className="chat-input">

            <input

                type="text"

                placeholder="Ask me anything..."

                value={text}

                onChange={(e) =>
                    setText(e.target.value)
                }

                onKeyDown={(e) =>
                    e.key === "Enter" && handleSend()
                }

            />

            <button onClick={handleSend}>

                Send

            </button>

        </div>

    );

}

export default ChatInput;