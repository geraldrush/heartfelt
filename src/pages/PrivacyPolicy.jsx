import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-600 mb-4">
            <strong>Last updated:</strong> {new Date().toLocaleDateString()}
          </p>
          
          <section className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 mb-2">We collect information you provide directly to us, such as:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Account information (name, email, age, location)</li>
              <li>Profile information and photos</li>
              <li>Messages and interactions with other users</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>To provide and improve our services</li>
              <li>To facilitate connections between users</li>
              <li>To send important updates and notifications</li>
              <li>To ensure safety and prevent abuse</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">3. Information Sharing</h2>
            <p className="text-gray-600">
              We do not sell, trade, or rent your personal information to third parties. 
              We may share information only in specific circumstances such as legal compliance 
              or with your explicit consent.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">4. Your Rights (GDPR)</h2>
            <p className="text-gray-600 mb-2">If you are in the EU, you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data (right to be forgotten)</li>
              <li>Export your data</li>
              <li>Object to processing</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">5. Data Security</h2>
            <p className="text-gray-600">
              We implement appropriate security measures to protect your information against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">6. Contact Us</h2>
            <p className="text-gray-600">
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@heartfelt.app" className="text-blue-500 hover:text-blue-600">
                privacy@heartfelt.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;