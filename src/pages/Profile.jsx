// src/pages/Profile.jsx
import React, { useState } from 'react';
import { FaPen, FaSignOutAlt, FaTachometerAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';

const Profile = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // State for user profile details
  const [username, setUsername] = useState('User123');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('Female');
  const [race, setRace] = useState('Asian');
  const [religion, setReligion] = useState('None');
  const [story, setStory] = useState("I love exploring new cultures and sharing stories.");
  const [preferences, setPreferences] = useState("Looking for meaningful connections and friendships.");
  const [tokenBalance, setTokenBalance] = useState(200); // Token balance state

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

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
    <div className="mobile-container pull-to-refresh bg-premium-mesh p-4 pb-[calc(100px+env(safe-area-inset-bottom,0px))] md:pb-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 bg-clip-text text-transparent">User Profile</h1>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/landing')}>
              <FaTachometerAlt className="mr-2" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <FaSignOutAlt className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Token Balance Display */}
        <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Token Balance</h2>
          <p className="text-2xl font-bold text-rose-600 mb-4">{tokenBalance} Tokens</p>
          <Button onClick={handleTopUp} size="sm">
            Top Up Tokens
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl shadow-lg space-y-6">
        {/* Username */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Username</label>
            <p className="border-b border-gray-300 pb-1">{username}</p>
          </div>
          <FaPen className="text-rose-500 cursor-pointer hover:text-rose-600" onClick={() => setUsername(prompt("Enter new username:", username))} />
        </div>

        {/* Age */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Age</label>
            <p className="border-b border-gray-300 pb-1">{age}</p>
          </div>
          <FaPen className="text-rose-500 cursor-pointer hover:text-rose-600" onClick={() => setAge(prompt("Enter new age:", age))} />
        </div>

        {/* Gender */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Gender</label>
            <p className="border-b border-gray-300 pb-1">{gender}</p>
          </div>
          <FaPen className="text-rose-500 cursor-pointer hover:text-rose-600" onClick={() => setGender(prompt("Enter new gender:", gender))} />
        </div>

        {/* Race */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Race</label>
            <p className="border-b border-gray-300 pb-1">{race}</p>
          </div>
          <FaPen className="text-rose-500 cursor-pointer hover:text-rose-600" onClick={() => setRace(prompt("Enter new race:", race))} />
        </div>

        {/* Religion */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Religion</label>
            <p className="border-b border-gray-300 pb-1">{religion}</p>
          </div>
          <FaPen className="text-rose-500 cursor-pointer hover:text-rose-600" onClick={() => setReligion(prompt("Enter new religion:", religion))} />
        </div>

        {/* My Story */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">My Story</label>
            <p className="border-b border-gray-300 pb-1">{story}</p>
          </div>
          <FaPen className="text-rose-500 cursor-pointer hover:text-rose-600" onClick={() => setStory(prompt("Enter new story:", story))} />
        </div>

        {/* Preferences */}
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <label className="block mb-1 text-gray-700">Preferences</label>
            <p className="border-b border-gray-300 pb-1">{preferences}</p>
          </div>
          <FaPen className="text-rose-500 cursor-pointer hover:text-rose-600" onClick={() => setPreferences(prompt("Enter new preferences:", preferences))} />
        </div>

        <Button type="submit" className="w-full">
          Save Changes
        </Button>
      </form>
      </div>
    </div>
  );
};

export default Profile;
