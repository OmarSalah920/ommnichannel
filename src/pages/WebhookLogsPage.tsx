import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RefreshCw } from 'lucide-react';

interface WebhookLog {
  id: string;
  webhook_url: string;
  method: string;
  headers: any;
  body: any;
  processed: boolean;
  error: string | null;
  created_at: string;
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Webhook Logs</h1>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold">Recent Webhooks</h2>
          </div>
          <div className="divide-y max-h-[calc(100vh-200px)] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No webhooks received yet. Send a test message from Gupshup.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedLog?.id === log.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold">
                      {log.method}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        log.processed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.processed ? 'Processed' : 'Failed'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {log.webhook_url}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  {log.error && (
                    <div className="mt-2 text-xs text-red-600">
                      Error: {log.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h2 className="font-semibold">Webhook Details</h2>
          </div>
          <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {!selectedLog ? (
              <div className="text-center text-gray-500 py-8">
                Select a webhook to view details
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Request Info</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                    <div><strong>Method:</strong> {selectedLog.method}</div>
                    <div><strong>URL:</strong> {selectedLog.webhook_url}</div>
                    <div><strong>Time:</strong> {new Date(selectedLog.created_at).toLocaleString()}</div>
                    <div><strong>Status:</strong> {selectedLog.processed ? 'Processed' : 'Failed'}</div>
                    {selectedLog.error && (
                      <div><strong>Error:</strong> <span className="text-red-600">{selectedLog.error}</span></div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Body</h3>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.body, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Headers</h3>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.headers, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
