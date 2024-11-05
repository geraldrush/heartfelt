// src/pages/Profile.jsx
import React, { useState } from 'react';
import { FaPen } from 'react-icons/fa';

const Profile = () => {
  const [username, setUsername] = useState('User123');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('Female');
  const [race, setRace] = useState('Asian');
  const [religion, setReligion] = useState('None');
  const [story, setStory] = useState("I love exploring new cultures and sharing stories.");
  const [preferences, setPreferences] = useState("Looking for meaningful connections and friendships.");
  const [tokenBalance, setTokenBalance] = useState(200);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Profile updated successfully!');
  };

  const handleTopUp = () => {
    const amount = prompt("Enter the amount of tokens to add:");
    if (amount && !isNaN(amount)) {
      setTokenBalance(prevBalance => prevBalance + Number(amount));
      alert(`You have successfully topped up ${amount} tokens!`);
    } else {
      alert("Invalid amount entered.");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-6">
      <h1 className="text-4xl font-bold mb-6 text-white">User Profile</h1>

      {/* Token Balance Display */}
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-2">Token Balance</h2>
        <p className="text-gray-800 text-lg">{tokenBalance} Tokens</p>
        <button
          onClick={handleTopUp}
          className="mt-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
        >
          Top Up Tokens
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md space-y-6">
        {/* Profile Fields */}
        {[ 
          { label: 'Username', value: username, setter: setUsername },
          { label: 'Age', value: age, setter: setAge },
          { label: 'Gender', value: gender, setter: setGender },
          { label: 'Race', value: race, setter: setRace },
          { label: 'Religion', value: religion, setter: setReligion },
          { label: 'My Story', value: story, setter: setStory },
          { label: 'Preferences', value: preferences, setter: setPreferences }
        ].map(({ label, value, setter }, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex-grow">
              <label className="block mb-1 text-gray-700 font-semibold">{label}</label>
              <p className="border-b border-gray-300 pb-1 text-gray-800">{value}</p>
            </div>
            <FaPen 
              className="text-blue-500 cursor-pointer hover:text-blue-600" 
              onClick={() => setter(prompt(`Enter new ${label.toLowerCase()}:`, value))} 
            />
          </div>
        ))}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default Profile;
