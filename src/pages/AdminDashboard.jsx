import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, eventsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/security/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/security/events?limit=50`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          })
        ]);

        if (!statsRes.ok || !eventsRes.ok) {
          throw new Error('Unauthorized');
        }

        const statsData = await statsRes.json();
        const eventsData = await eventsRes.json();

        setStats(statsData.stats || []);
        setEvents(eventsData.events || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEvents = filter
    ? events.filter(e => e.event_type === filter)
    : events;

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-200 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            Back to App
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.event_type} className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{stat.event_type}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
              <p className="text-xs text-gray-400 mt-2">
                Last: {new Date(stat.last_occurrence).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Events</h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Events</option>
                {stats.map(s => (
                  <option key={s.event_type} value={s.event_type}>{s.event_type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        {event.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {event.user_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {event.ip_address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {event.metadata ? JSON.stringify(JSON.parse(event.metadata)).slice(0, 50) + '...' : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
