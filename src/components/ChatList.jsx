import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConnections, getUnreadCounts } from '../utils/api.js';

const ChatList = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [connectionsData, unreadData] = await Promise.all([
          getConnections(),
          getUnreadCounts(),
        ]);
        setConnections(connectionsData.connections || []);
        const counts = (unreadData.counts || []).reduce((acc, item) => {
          acc[item.connection_id] = item.unread_count;
          return acc;
        }, {});
        setUnreadCounts(counts);
      } catch (error) {
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading chats...</div>;
  }

  if (connections.length === 0) {
    return <div className="text-sm text-slate-500">No connections yet.</div>;
  }

  return (
    <div className="space-y-3">
      {connections.map((connection) => (
        <button
          key={connection.id}
          type="button"
          onClick={() => navigate(`/chat?connectionId=${connection.id}`)}
          className="w-full rounded-xl bg-white px-4 py-3 text-left shadow hover:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {connection.full_name}
              </p>
              <p className="text-xs text-slate-500">{connection.location_city}</p>
            </div>
            {unreadCounts[connection.id] ? (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                {unreadCounts[connection.id]}
              </span>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ChatList;
