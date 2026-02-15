import React from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Privacy Policy | AfroDate"
        description="Learn how AfroDate collects, uses, and protects your personal information. Read our comprehensive privacy policy."
      />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <button onClick={() => navigate(-1)} className="mb-6 text-orange-600 hover:underline">
          ← Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly, including name, email, profile details, and payment information. We also collect usage data, device information, and location data.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our services</li>
              <li>Process payments and transactions</li>
              <li>Send notifications and updates</li>
              <li>Ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with service providers, payment processors, and as required by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Cookies</h2>
            <p>We use cookies and similar technologies to enhance your experience, analyze usage, and personalize content. You can control cookies through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Request data correction or deletion</li>
              <li>Export your data</li>
              <li>Withdraw consent</li>
              <li>Object to data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
            <p>We retain your data as long as your account is active or as needed to provide services. You may request deletion at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p>Our service is not intended for users under 18. We do not knowingly collect data from children.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contact Us</h2>
            <p>For privacy concerns or data requests, contact us at: <a href="mailto:privacy@heartfelt.app" className="text-orange-600 hover:underline">privacy@heartfelt.app</a></p>
          </section>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
