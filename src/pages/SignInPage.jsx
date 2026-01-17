// src/pages/SignInPage.jsx
import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const SignInPage = () => {
  const handleGoogleSuccess = (credentialResponse) => {
    console.log('Success:', credentialResponse);
    // Handle successful authentication logic here
  };

  const handleGoogleFailure = (error) => {
    console.error('Failure:', error);
    // Handle failure logic here
  };

  return (
    <GoogleOAuthProvider clientId="YOUR_GOOGLE_CLIENT_ID">
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-400 to-purple-500 text-white text-center">
        <h1 className="text-5xl font-bold mb-4">Heartfelt Connections</h1>
        <p className="text-lg mb-8">Find love beyond faces, connect through stories.</p>
        
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Join Us Today!</h2>
          <p className="mt-2">
            Sign in or create an account to start sharing your story and connect with others.
          </p>
        </div>
        
        <div className="flex flex-col space-y-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
            type="standard"
            shape="pill"
            theme="filled_blue"
            text="continue_with"
          />
        </div>
        
        <footer className="mt-10">
          <p className="text-sm">© {new Date().getFullYear()} Heartfelt Connections. All rights reserved.</p>
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
};

export default SignInPage;
