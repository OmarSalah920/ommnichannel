import { useState } from 'react';
import { Header } from '../components/layout/Header';
import {
  Settings,
  Bell,
  Globe,
  Shield,
  Database,
  Palette,
  Clock,
  Save,
  RefreshCw,
} from 'lucide-react';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'business-hours', label: 'Business Hours', icon: Clock },
  ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <>
      <Header title="Settings" subtitle="Configure your workspace preferences" />

      <div className="flex-1 overflow-hidden flex">
        <div className="w-64 bg-white border-r border-slate-200 p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Workspace Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      defaultValue="My Company"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      defaultValue="support@company.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Default Language
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Timezone
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option>UTC (Coordinated Universal Time)</option>
                      <option>EST (Eastern Standard Time)</option>
                      <option>PST (Pacific Standard Time)</option>
                      <option>GMT (Greenwich Mean Time)</option>
                      <option>CET (Central European Time)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Conversation Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Auto-assign conversations</p>
                      <p className="text-sm text-slate-500">
                        Automatically assign new conversations to available agents
                      </p>
                    </div>
                    <button className="relative w-12 h-7 bg-blue-600 rounded-full">
                      <span className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Auto-close resolved conversations</p>
                      <p className="text-sm text-slate-500">
                        Automatically close conversations after 24 hours of inactivity
                      </p>
                    </div>
                    <button className="relative w-12 h-7 bg-slate-200 rounded-full">
                      <span className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Default conversation priority
                    </label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option>Medium</option>
                      <option>Low</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Email Notifications</h3>
                <div className="space-y-4">
                  {[
                    { label: 'New conversation assigned', desc: 'When a new conversation is assigned to you' },
                    { label: 'Customer reply', desc: 'When a customer replies to your conversation' },
                    { label: 'Mention notifications', desc: 'When you are mentioned in a note' },
                    { label: 'Daily digest', desc: 'Daily summary of your inbox activity' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <button className="relative w-12 h-7 bg-blue-600 rounded-full">
                        <span className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full shadow" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Desktop Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Enable desktop notifications</p>
                      <p className="text-sm text-slate-500">
                        Show browser notifications for new messages
                      </p>
                    </div>
                    <button className="relative w-12 h-7 bg-blue-600 rounded-full">
                      <span className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Sound notifications</p>
                      <p className="text-sm text-slate-500">Play a sound for new messages</p>
                    </div>
                    <button className="relative w-12 h-7 bg-slate-200 rounded-full">
                      <span className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Two-factor authentication</p>
                      <p className="text-sm text-slate-500">
                        Require 2FA for all team members
                      </p>
                    </div>
                    <button className="relative w-12 h-7 bg-slate-200 rounded-full">
                      <span className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Session timeout (minutes)
                    </label>
                    <input
                      type="number"
                      defaultValue={60}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      IP Whitelist
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Enter IP addresses, one per line"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  {['Light', 'Dark', 'System'].map((theme) => (
                    <button
                      key={theme}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        theme === 'Light'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-full h-16 rounded-lg mb-2 ${
                          theme === 'Dark' ? 'bg-slate-800' : 'bg-slate-100'
                        }`}
                      />
                      <p className="font-medium text-slate-900">{theme}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Brand Colors</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        defaultValue="#2563eb"
                        className="w-10 h-10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        defaultValue="#2563eb"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business-hours' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Business Hours</h3>
                <div className="space-y-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                    (day) => (
                      <div key={day} className="flex items-center gap-4">
                        <div className="w-24">
                          <span className="font-medium text-slate-900">{day}</span>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            defaultChecked={day !== 'Saturday' && day !== 'Sunday'}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-600">Open</span>
                        </label>
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            defaultValue="09:00"
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            defaultValue="17:00"
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Away Message</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Auto-reply outside business hours
                  </label>
                  <textarea
                    rows={3}
                    defaultValue="Thank you for reaching out! We're currently outside business hours. We'll get back to you as soon as possible during our next business day."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="max-w-2xl mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
