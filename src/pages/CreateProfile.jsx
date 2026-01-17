import React, { useState } from 'react'; 

const CreateProfile = () => {
  const [story, setStory] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [race, setRace] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Your profile has been created!");
    // Here you can add further logic to handle the form submission, 
    // such as sending the data to an API.
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h2 className="text-3xl font-semibold mb-4">Create Your Story</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white p-6 rounded-lg shadow-md">
        
        {/* Gender Selection */}
        <div className="mb-4">
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          >
            <option value="">Select your gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Age Input */}
        <div className="mb-4">
          <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
          <input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
            placeholder="Your age"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Race Input */}
        <div className="mb-4">
          <label htmlFor="race" className="block text-sm font-medium text-gray-700">Race</label>
          <input
            id="race"
            type="text"
            value={race}
            onChange={(e) => setRace(e.target.value)}
            required
            placeholder="Your race"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* User Story Input */}
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Share your story, interests, and values..."
          required
          className="w-full p-4 mb-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-blue-400"
          rows="6"
        />

        {/* Submit Button */}
        <button type="submit" className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition">
          Submit
        </button>
      </form>
    </div>
  );
};

export default CreateProfile;
