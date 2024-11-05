import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faBan } from '@fortawesome/free-solid-svg-icons';

const ChatPage = () => {
  const { username } = useParams(); // Get the username from the URL
  const [messages, setMessages] = useState([
    { id: 1, sender: 'me', text: 'Hey! How are you?', timestamp: '2024-10-29 14:30' },
    { id: 2, sender: 'other', text: 'I am good, thanks! How about you?', timestamp: '2024-10-29 14:32' },
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: messages.length + 1,
        sender: 'me',
        text: newMessage,
        timestamp: new Date().toLocaleString(),
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    }
  };

  const handleCall = () => {
    // Implement your call functionality here
    alert(`Calling ${username}...`);
  };

  const handleBlock = () => {
    // Implement your block functionality here
    alert(`Blocking ${username}...`);
  };

  return (
    <div className="flex flex-col h-screen bg-white p-4">
      <header className="text-xl font-bold text-center text-blue-500 mb-4 sticky top-0 bg-white p-2 z-10 border-b border-gray-200 flex justify-between items-center">
        <span>Chat with {username}</span>
        <div className="flex space-x-2">
          <button 
            onClick={handleCall} 
            className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600"
            aria-label={`Call ${username}`}
          >
            <FontAwesomeIcon icon={faPhone} />
          </button>
          <button 
            onClick={handleBlock} 
            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600"
            aria-label={`Block ${username}`}
          >
            <FontAwesomeIcon icon={faBan} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg max-w-xs md:max-w-md ${
              msg.sender === 'me' ? 'bg-blue-500 text-white self-start' : 'bg-gray-200 text-gray-800 self-end'
            }`}
          >
            <p>{msg.text}</p>
            <span className="text-xs block mt-1 opacity-75">{msg.timestamp}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 mt-auto">
        <input
          type="text"
          className="flex-1 p-2 border rounded-lg"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
