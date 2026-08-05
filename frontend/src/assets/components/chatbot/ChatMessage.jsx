function ChatMessage({ message }) {

    return (

        <div
            className={
                message.sender === "user"
                    ? "message user"
                    : "message bot"
            }
        >

            {message.text}

        </div>

    );

}

export default ChatMessage;