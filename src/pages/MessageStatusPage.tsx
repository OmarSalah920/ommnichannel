import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, AlertCircle, Send } from 'lucide-react';

interface MessageStatus {
  id: string;
  external_message_id: string;
  status: string;
  destination: string;
  error_code: string | null;
  error_reason: string | null;
  metadata: any;
  status_timestamp: string;
  created_at: string;
  message_id: string | null;
  messages?: {
    content: string;
    sender_type: string;
    created_at: string;
  };
}

interface MessageSendLog {
  id: string;
  conversation_id: string;
  channel_type: string;
  recipient_id: string;
  content: string;
  success: boolean;
  error_message: string | null;
  api_response: any;
  external_message_id: string | null;
  created_at: string;
}

export default function MessageStatusPage() {
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [sendLogs, setSendLogs] = useState<MessageSendLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const { data: statuses } = await supabase
      .from('message_status')
      .select(`
        *,
        messages!inner(content, sender_type, created_at)
      `)
      .eq('messages.sender_type', 'agent')
      .order('status_timestamp', { ascending: false })
      .limit(50);

    const { data: logs } = await supabase
      .from('message_send_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (statuses) setMessageStatuses(statuses);
    if (logs) setSendLogs(logs);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'sent':
        return <Send className="w-5 h-5 text-blue-500" />;
      case 'enqueued':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'read':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'enqueued':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Message Delivery Status</h1>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">Webhook Configuration Required</h3>
              <p className="text-sm text-blue-800">
                To receive delivery status updates, configure the following webhook URL in your Gupshup Dashboard:
              </p>
              <code className="block bg-white px-3 py-2 rounded text-sm text-blue-900 border border-blue-200">
                {window.location.origin.replace('localhost:5173', window.location.hostname)}/functions/v1/channel-webhook
              </code>
              <p className="text-sm text-blue-800">
                Steps: Go to Gupshup Dashboard → Your App → Settings → Webhook URL → Paste the URL above → Save
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Delivery Status Updates</h2>
            <p className="text-sm text-gray-500 mt-1">
              Real-time delivery status from webhooks.
              <span className="inline-block ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                Yellow rows indicate delayed webhook arrival (may arrive out of order)
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : messageStatuses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No delivery status updates yet. Make sure the webhook is configured in Gupshup.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Webhook Received</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {messageStatuses.map((status) => {
                    const statusTime = new Date(status.status_timestamp);
                    const webhookTime = new Date(status.created_at);
                    const delaySeconds = Math.round((webhookTime.getTime() - statusTime.getTime()) / 1000);
                    const isDelayed = delaySeconds > 2;

                    return (
                      <tr key={status.id} className={isDelayed ? 'bg-yellow-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status.status)}
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(status.status)}`}>
                              {status.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {status.messages?.content || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{status.destination}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {statusTime.toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-1">
                            <span className={isDelayed ? 'text-yellow-700 font-medium' : 'text-gray-500'}>
                              {webhookTime.toLocaleTimeString()}
                            </span>
                            {isDelayed && (
                              <span className="text-xs text-yellow-600">
                                (+{delaySeconds}s)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {status.error_code ? (
                            <div className="text-red-600">
                              <div className="font-semibold">{status.error_code}</div>
                              <div className="text-xs">{status.error_reason}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Send Attempt Logs</h2>
            <p className="text-sm text-gray-500 mt-1">Initial API submission status</p>
          </div>
          <div className="overflow-x-auto">
            {sendLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No send attempts logged yet</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Response</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sendLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.success ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                            Submitted
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.recipient_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{log.content}</td>
                      <td className="px-6 py-4 text-xs">
                        {log.error_message ? (
                          <span className="text-red-600">{log.error_message}</span>
                        ) : (
                          <span className="text-gray-500">{log.api_response?.status || 'N/A'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
    </div>
  );
}
