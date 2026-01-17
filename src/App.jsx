// src/App.jsx
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignInPage from './pages/SignInPage';
import LandingPage from './pages/LandingPage';
import CreateProfile from './pages/CreateProfile';
import StoryFeed from './pages/StoryFeed';
import Chat from './pages/Chat';
import SentRequests from './pages/SentRequests'; // Import new component
import ReceivedRequests from './pages/ReceivedRequests'; // Import new component
import Connections from './pages/Connections'; // Import new component
import Profile from './pages/Profile'; // Import new component

const App = () => (
  <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID"> {/* Replace with your Google client ID */}
    <Router>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route path="/stories" element={<StoryFeed />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/sent-requests" element={<SentRequests />} /> {/* New route */}
        <Route path="/received-requests" element={<ReceivedRequests />} /> {/* New route */}
        <Route path="/connections" element={<Connections />} /> {/* New route */}
        <Route path="/profile" element={<Profile />} /> {/* New route */}
      </Routes>
    </Router>
  </GoogleOAuthProvider>
);

export default App;
