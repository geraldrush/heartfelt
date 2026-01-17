// src/pages/Chat.jsx
import React, { useState } from 'react';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    setMessages([...messages, input]);
    setInput("");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <h2 className="text-3xl font-semibold mb-4">Chat</h2>
      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-md">
        <div className="space-y-2 mb-4">
          {messages.map((msg, index) => (
            <p key={index} className="text-gray-700">{msg}</p>
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          />
          <button onClick={sendMessage} className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition">
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
