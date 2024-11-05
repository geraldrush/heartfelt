// src/pages/SignInPage.jsx
import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

const SignInPage = () => {
  const navigate = useNavigate();

 const handleGoogleSuccess = (credentialResponse) => {
    console.log('Success:', credentialResponse);
    // Handle successful authentication logic here

    // Redirect to the landing page
    navigate('/landing');
  };

  /*const handleGoogleSuccess = async (credentialResponse) => {
    console.log('Success:', credentialResponse);

    // Decode the credential to extract user information
    const token = credentialResponse.credential;
    
    // Fetch user information from Google API (you can use a library like jwt-decode)
    const userInfo = decodeToken(token); // You can use a library like 'jwt-decode' to decode the token
    const { name, email, picture } = userInfo; // Adjust based on the structure of the token

    // Send user info to the backend to save in the database
    try {
        const response = await fetch('http://your-backend-api.com/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                email,
                location: 'user location here', // Replace with actual location if available
                profilePicture: picture,
            }),
        });

        if (response.ok) {
            // Successfully saved user info
            navigate('/landing'); // Redirect to landing page
        } else {
            // Handle errors from your backend
            console.error('Failed to save user info:', await response.text());
        }
    } catch (error) {
        console.error('Error saving user info:', error);
    }
};  */


  const handleGoogleFailure = (error) => {
    console.error('Failure:', error);
    // Handle failure logic here
  };

  return (
    <GoogleOAuthProvider clientId="452402993107-b050f4j8nam3cme9ob430m3810570g68.apps.googleusercontent.com">
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
