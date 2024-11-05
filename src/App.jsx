// src/App.jsx
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import SignInPage from './pages/SignInPage';
import LandingPage from './pages/LandingPage';
import StoryFeed from './pages/StoryFeed';
import ChatPage from './pages/ChatPage';
import SentRequests from './pages/SentRequests'; // Import new component
import ReceivedRequests from './pages/ReceivedRequests'; // Import new component
import Connections from './pages/Connections'; // Import new component
import Profile from './pages/Profile'; // Import new component
import TokensPage from './pages/TokensPage';

const App = () => (
  <GoogleOAuthProvider clientId="452402993107-b050f4j8nam3cme9ob430m3810570g68.apps.googleusercontent.com"> {/* Replace with your Google client ID */}
    <Router>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/stories" element={<StoryFeed />} />
        <Route path="/chat/:username" element={<ChatPage />} /> {/* Corrected path */}
        <Route path="/sent-requests" element={<SentRequests />} />
        <Route path="/received-requests" element={<ReceivedRequests />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tokens" element={<TokensPage />} />
      </Routes>
    </Router>
  </GoogleOAuthProvider>
);

export default App;