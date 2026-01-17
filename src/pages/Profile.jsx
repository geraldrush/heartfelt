// src/pages/Profile.jsx
import React, { useState } from 'react';
import { FaPen } from 'react-icons/fa'; // Ensure this line is correct

const Profile = () => {
  // State for user profile details
  const [username, setUsername] = useState('User123');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('Female');
  const [race, setRace] = useState('Asian');
  const [religion, setReligion] = useState('None');
  const [story, setStory] = useState("I love exploring new cultures and sharing stories.");
  const [preferences, setPreferences] = useState("Looking for meaningful connections and friendships.");
  const [tokenBalance, setTokenBalance] = useState(200); // Token balance state

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic to save updated user information
    alert('Profile updated successfully!');
  };

  const handleTopUp = () => {
    // Logic for topping up tokens (e.g., opening a payment dialog)
    const amount = prompt("Enter the amount of tokens to add:");
    if (amount && !isNaN(amount)) {
      setTokenBalance(prevBalance => prevBalance + Number(amount));
      alert(`You have successfully topped up ${amount} tokens!`);
    } else {
      alert("Invalid amount entered.");
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 p-4">
      <h1 className="text-3xl font-bold mb-6 text-white">User Profile</h1>

      {/* Token Balance Display */}
      <div className="bg-white p-4 rounded-lg shadow-md w-full max-w-lg mb-4">
        <h2 className="text-xl font-semibold mb-2">Token Balance</h2>
        <p className="text-gray-700">{tokenBalance} Tokens</p>
        <button
          onClick={handleTopUp}
          className="mt-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
        >
          Top Up Tokens
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg space-y-4">
        {/* Username */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Username</label>
            <p className="border-b border-gray-300 pb-1">{username}</p>
          </div>
          <FaPen className="text-blue-500 cursor-pointer" onClick={() => setUsername(prompt("Enter new username:", username))} />
        </div>

        {/* Age */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Age</label>
            <p className="border-b border-gray-300 pb-1">{age}</p>
          </div>
          <FaPen className="text-blue-500 cursor-pointer" onClick={() => setAge(prompt("Enter new age:", age))} />
        </div>

        {/* Gender */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Gender</label>
            <p className="border-b border-gray-300 pb-1">{gender}</p>
          </div>
          <FaPen className="text-blue-500 cursor-pointer" onClick={() => setGender(prompt("Enter new gender:", gender))} />
        </div>

        {/* Race */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Race</label>
            <p className="border-b border-gray-300 pb-1">{race}</p>
          </div>
          <FaPen className="text-blue-500 cursor-pointer" onClick={() => setRace(prompt("Enter new race:", race))} />
        </div>

        {/* Religion */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Religion</label>
            <p className="border-b border-gray-300 pb-1">{religion}</p>
          </div>
          <FaPen className="text-blue-500 cursor-pointer" onClick={() => setReligion(prompt("Enter new religion:", religion))} />
        </div>

        {/* My Story */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">My Story</label>
            <p className="border-b border-gray-300 pb-1">{story}</p>
          </div>
          <FaPen className="text-blue-500 cursor-pointer" onClick={() => setStory(prompt("Enter new story:", story))} />
        </div>

        {/* Preferences */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Preferences</label>
            <p className="border-b border-gray-300 pb-1">{preferences}</p>
          </div>
          <FaPen className="text-blue-500 cursor-pointer" onClick={() => setPreferences(prompt("Enter new preferences:", preferences))} />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default Profile;
