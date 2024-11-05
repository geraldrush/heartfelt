import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StoryFeed = () => {
  const [stories, setStories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStories, setFilteredStories] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // Sample stories with an isOnline property and a username
    setStories([
      { id: 1, username: 'Alice125', gender: 'Female', age: 25, race: 'Asian', location: 'Pretoria', text: "Love reading and hiking in the mountains.", interests: "hiking, reading", values: "peace, exploration", isOnline: true },
      { id: 2, username: 'ChefJohn', gender: 'Male', age: 30, race: 'African', location: 'Polokwane', text: "Passionate about cooking and volunteering at shelters.", interests: "cooking, volunteering", values: "kindness, community", isOnline: false },
      { id: 3, username: 'ArtLover22', gender: 'Non-Binary', age: 22, race: 'Indian', location: 'Johannesburg', text: "Enjoys art, traveling, and exploring new cultures.", interests: "art, travel", values: "creativity, openness", isOnline: true },
    ]);
  }, []);

  useEffect(() => {
    const results = stories.filter((story) =>
      story.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.age.toString() === searchTerm ||
      story.gender.toLowerCase() === searchTerm.toLowerCase() ||
      story.race.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.interests.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.values.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStories(results);
  }, [searchTerm, stories]);

  const handleConnect = (id) => {
    setConnectionStatus((prevStatus) => ({
      ...prevStatus,
      [id]: true, // Mark as connected
    }));

    console.log(`Connection request sent to user ID: ${id}`);
    // Optionally redirect to Sent Requests page
    // navigate('/sent-requests'); // Uncomment if you want to navigate to the Sent Requests page after connecting
  };

  const handleProfileRedirect = (username) => {
    // Redirect to the user profile page based on the username
    navigate(`/profile/${username}`);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
      <h2 className="text-3xl font-semibold mb-6 text-white">Explore Stories</h2>

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Type here to search..."
        className="p-3 w-full max-w-lg border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 mb-6 shadow"
      />

      <div className="w-full max-w-2xl space-y-4">
        {filteredStories.map((story) => (
          <div key={story.id} className="bg-white p-6 rounded-lg shadow-md transition-transform transform hover:scale-105">
            <div className="flex justify-between items-center mb-2">
              <p 
                onClick={() => handleProfileRedirect(story.username)} 
                className="mb-2 text-gray-700 cursor-pointer hover:text-blue-600"
              >
                <strong>Username:</strong> {story.username}
              </p>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full ${story.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={`ml-2 text-sm ${story.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                  {story.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <p className="mb-2 text-gray-700"><strong>Gender:</strong> {story.gender}</p>
            <p className="mb-2 text-gray-700"><strong>Age:</strong> {story.age}</p>
            <p className="mb-2 text-gray-700"><strong>Race:</strong> {story.race}</p>
            <p className="mb-2 text-gray-700"><strong>Location:</strong> {story.location}</p>
            <p className="mb-4 text-gray-700"><strong>My Story:</strong> {story.text}</p>
            <button
              onClick={() => handleConnect(story.id)}
              className={`py-2 px-4 rounded-lg transition duration-300 ${connectionStatus[story.id] ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              {connectionStatus[story.id] ? 'Request Sent' : 'Connect'}
            </button>
          </div>
        ))}
        {/* No results message */}
        {filteredStories.length === 0 && (
          <p className="text-gray-600 mt-6">No stories match your search criteria.</p>
        )}
      </div>
    </div>
  );
};

export default StoryFeed;
