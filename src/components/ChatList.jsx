import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getConnections, getUnreadCounts } from '../utils/api.js';

const ChatList = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const initials = (name = '') => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

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

  const orderedConnections = useMemo(() => connections, [connections]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading chats...</div>;
  }

  if (connections.length === 0) {
    return <div className="text-sm text-slate-500">No connections yet.</div>;
  }

  return (
    <div className="space-y-3">
      {orderedConnections.map((connection) => {
        const hasUnread = unreadCounts[connection.id];
        return (
          <button
            key={connection.id}
            type="button"
            onClick={() => navigate(`/chat?connectionId=${connection.id}`)}
            className="group w-full rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/connection/${connection.id}`);
                }}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100"
              >
                {connection.image_url ? (
                  <img
                    src={connection.image_url}
                    alt={connection.full_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-600">
                    {initials(connection.full_name)}
                  </span>
                )}
                <span
                  className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    connection.is_online ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {connection.full_name}
                  </p>
                  <span className={`text-[11px] font-medium ${
                    connection.is_online ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {connection.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {connection.location_city || 'Location hidden'}
                </p>
              </div>

              {hasUnread ? (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {hasUnread}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">Open</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;
