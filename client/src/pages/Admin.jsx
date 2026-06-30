import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../api';
import { toast } from 'react-hot-toast';
import { 
  ShieldAlert, 
  RefreshCw, 
  Activity, 
  Database, 
  Server, 
  HardDrive, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Terminal, 
  Clock,
  LogOut,
  TrendingUp
} from 'lucide-react';

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [credentials, setCredentials] = useState(null);
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // in seconds
  const [manualUptime, setManualUptime] = useState(0);

  // Load admin session from sessionStorage if present
  useEffect(() => {
    const savedCreds = sessionStorage.getItem('workos_admin_creds');
    if (savedCreds) {
      try {
        const parsed = JSON.parse(savedCreds);
        setCredentials(parsed);
        setIsAdmin(true);
      } catch (e) {
        sessionStorage.removeItem('workos_admin_creds');
      }
    }
  }, []);

  // Fetch admin stats
  const fetchStats = async (credsToUse = credentials) => {
    if (!credsToUse) return;
    setLoading(true);
    try {
      const response = await adminAPI.getStats(credsToUse.username, credsToUse.password);
      setStats(response.data);
      setManualUptime(response.data.uptime);
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve system health metrics.');
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Uptime ticker
  useEffect(() => {
    if (!stats) return;
    const timer = setInterval(() => {
      setManualUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [stats]);

  // Auto refresh interval hook
  useEffect(() => {
    if (!isAdmin || !credentials || refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchStats(credentials);
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isAdmin, credentials, refreshInterval]);

  // Fetch stats initially when logging in
  useEffect(() => {
    if (isAdmin && credentials) {
      fetchStats(credentials);
    }
  }, [isAdmin, credentials]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) {
      toast.error('Please enter admin credentials.');
      return;
    }
    setLoading(true);
    try {
      await adminAPI.verify(usernameInput, passwordInput);
      const creds = { username: usernameInput, password: passwordInput };
      sessionStorage.setItem('workos_admin_creds', JSON.stringify(creds));
      setCredentials(creds);
      setIsAdmin(true);
      toast.success('Successfully authenticated as administrator.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials. Access Denied.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('workos_admin_creds');
    setIsAdmin(false);
    setCredentials(null);
    setStats(null);
    toast.success('Logged out from admin interface.');
  };

  // Format Helper: Bytes to human readable
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format Helper: Uptime format
  const formatDuration = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-yellow-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black dark:border-white">
            <div className="w-10 h-10 bg-yellow-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <ShieldAlert className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">Admin Portal</h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50">Restricted Access Area</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1 text-black dark:text-white">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter admin username"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border-2 border-black dark:border-white font-mono text-sm text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1 text-black dark:text-white">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border-2 border-black dark:border-white font-mono text-sm text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 border-2 border-black font-mono text-xs uppercase font-black tracking-wider transition-all duration-150 cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none text-black disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Access Console'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-black dark:text-white font-sans p-4 md:p-6 pb-12">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto mb-6 bg-white dark:bg-black border-2 border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Activity className="w-6 h-6 text-black animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight">WorkOS Admin Console</h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-black/50 dark:text-white/50">System Health & Live Monitoring</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-950 border border-black dark:border-white font-bold">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <span className="text-green-700 dark:text-green-400 uppercase tracking-widest text-[10px]">Live Connected</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase font-bold text-neutral-400">Refresh:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white px-1.5 py-0.5 text-xs focus:outline-none"
            >
              <option value={0}>Disabled</option>
              <option value={2}>2s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          </div>

          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="p-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-black dark:border-white cursor-pointer disabled:opacity-50 transition-colors"
            title="Refresh Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-wider border border-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {!stats ? (
        <div className="max-w-7xl mx-auto flex items-center justify-center h-[50vh] bg-white dark:bg-black border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
            <span className="font-mono text-sm font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Fetching Diagnostics...</span>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Database Availability & Connection Metrics */}
          <div className="space-y-6">
            
            {/* Database Availability Card */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-black/20 dark:border-white/20">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-yellow-500" /> Database Availability
                </h3>
              </div>
              
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white">
                  <span className="font-bold">Is the database server running?</span>
                  <span className={`px-2 py-0.5 border border-black font-black uppercase text-[10px] ${
                    stats.db.running 
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                  }`}>
                    {stats.db.running ? 'Yes (Running)' : 'No (Stopped)'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white">
                  <span className="font-bold">Connection status</span>
                  <span className="font-black text-black dark:text-white uppercase">
                    {stats.db.connectionStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Connection Metrics Card */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-black/20 dark:border-white/20">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" /> Connection Metrics
                </h3>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white">
                  <span className="font-bold">Active connections</span>
                  <span className="font-black text-black dark:text-white">
                    {stats.db.activeConnections}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white">
                  <span className="font-bold">Maximum allowed connections</span>
                  <span className="font-bold text-black/60 dark:text-white/60">
                    {stats.db.maxConnections}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white">
                  <span className="font-bold">Connection failures</span>
                  <span className={`px-2 py-0.5 border border-black font-black ${
                    stats.db.connectionFailures > 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : 'bg-neutral-100 text-black/50 dark:bg-neutral-800 dark:text-white/50'
                  }`}>
                    {stats.db.connectionFailures}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Column 2: Database Health & Network Traffic */}
          <div className="space-y-6">
            
            {/* Database Metrics Card */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-black/20 dark:border-white/20">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Database className="w-4 h-4" /> Database Health</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white p-3 font-mono">
                  <p className="text-[10px] text-black/50 dark:text-white/50 uppercase font-black">Data Size</p>
                  <p className="text-sm font-black mt-1 text-black dark:text-white">{formatBytes(stats.db.dataSize)}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white p-3 font-mono">
                  <p className="text-[10px] text-black/50 dark:text-white/50 uppercase font-black">Disk Storage</p>
                  <p className="text-sm font-black mt-1 text-black dark:text-white">{formatBytes(stats.db.storageSize)}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white p-3 font-mono">
                  <p className="text-[10px] text-black/50 dark:text-white/50 uppercase font-black">Total Users</p>
                  <p className="text-sm font-black mt-1 flex items-center gap-1 text-black dark:text-white">
                    <Users className="w-4 h-4 text-yellow-500" /> {stats.db.totalUsers}
                  </p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-white p-3 font-mono">
                  <p className="text-[10px] text-black/50 dark:text-white/50 uppercase font-black">DB Requests</p>
                  <p className="text-sm font-black mt-1 text-black dark:text-white">{stats.db.requestsCount}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-black/10 dark:border-white/10 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-black/70 dark:text-white/70">
                  <span>Collections count:</span>
                  <span className="font-bold">{stats.db.collections}</span>
                </div>
                <div className="flex justify-between text-black/70 dark:text-white/70">
                  <span>Total documents:</span>
                  <span className="font-bold">{stats.db.objects}</span>
                </div>
              </div>
            </div>

            {/* Network Traffic Card */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-black/20 dark:border-white/20">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Network Traffic</h3>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 bg-green-50 dark:bg-green-950/20 border border-black dark:border-white">
                  <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-black"><ArrowDownLeft className="w-4 h-4" /> RX (Received)</span>
                  <span className="font-black text-black dark:text-white">{formatBytes(stats.network.bytesReceived)}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/20 border border-black dark:border-white">
                  <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-black"><ArrowUpRight className="w-4 h-4" /> TX (Sent)</span>
                  <span className="font-black text-black dark:text-white">{formatBytes(stats.network.bytesSent)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-black/10 dark:border-white/10 space-y-2 font-mono text-xs text-black/70 dark:text-white/70">
                <div className="flex justify-between">
                  <span>Active Uptime:</span>
                  <span className="font-bold flex items-center gap-1 text-black dark:text-white">
                    <Clock className="w-3.5 h-3.5 text-yellow-500" /> {formatDuration(manualUptime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Node.js Version:</span>
                  <span className="font-bold text-black dark:text-white">{stats.system.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span>OS Platform:</span>
                  <span className="font-bold uppercase text-black dark:text-white">{stats.system.platform} ({stats.system.arch})</span>
                </div>
              </div>
            </div>

          </div>

          {/* Column 3: Traffic Analytics & Request Logs */}
          <div className="space-y-6">
            
            {/* Traffic Overview Card */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-black/20 dark:border-white/20">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Activity className="w-4 h-4" /> Traffic Analytics</h3>
                <span className="font-mono text-xs font-black px-2 py-0.5 bg-yellow-100 dark:bg-yellow-950 border border-black dark:border-white">
                  {stats.traffic.totalRequests} Requests
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-green-600 dark:text-green-400 font-bold">2xx (Success):</span>
                  <span className="font-bold">{stats.traffic.statusCodes['2xx'] || 0}</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 border border-black dark:border-white h-2.5">
                  <div 
                    className="bg-green-500 h-full"
                    style={{ width: `${stats.traffic.totalRequests > 0 ? ((stats.traffic.statusCodes['2xx'] || 0) / stats.traffic.totalRequests) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">3xx (Redirect):</span>
                  <span className="font-bold">{stats.traffic.statusCodes['3xx'] || 0}</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 border border-black dark:border-white h-2.5">
                  <div 
                    className="bg-blue-400 h-full"
                    style={{ width: `${stats.traffic.totalRequests > 0 ? ((stats.traffic.statusCodes['3xx'] || 0) / stats.traffic.totalRequests) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-yellow-600 dark:text-yellow-400 font-bold">4xx (Client Error):</span>
                  <span className="font-bold">{stats.traffic.statusCodes['4xx'] || 0}</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 border border-black dark:border-white h-2.5">
                  <div 
                    className="bg-yellow-400 h-full"
                    style={{ width: `${stats.traffic.totalRequests > 0 ? ((stats.traffic.statusCodes['4xx'] || 0) / stats.traffic.totalRequests) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-red-600 dark:text-red-400 font-bold">5xx (Server Error):</span>
                  <span className="font-bold">{stats.traffic.statusCodes['5xx'] || 0}</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 border border-black dark:border-white h-2.5">
                  <div 
                    className="bg-red-500 h-full"
                    style={{ width: `${stats.traffic.totalRequests > 0 ? ((stats.traffic.statusCodes['5xx'] || 0) / stats.traffic.totalRequests) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Request History Log Card */}
            <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-black/20 dark:border-white/20">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Terminal className="w-4 h-4" /> Live HTTP Logs</h3>
                <span className="text-[10px] font-mono text-black/55 dark:text-white/55">Last 100 reqs</span>
              </div>

              <div className="bg-neutral-900 border border-black text-green-400 font-mono text-[10px] p-3 rounded-none h-60 overflow-y-auto space-y-2 leading-relaxed">
                {stats.traffic.requestHistory.length === 0 ? (
                  <div className="text-neutral-500 italic text-center pt-8">No requests logged yet. Start navigating the application!</div>
                ) : (
                  [...stats.traffic.requestHistory].reverse().map((log, idx) => {
                    const isSuccess = log.status < 400;
                    const isClientErr = log.status >= 400 && log.status < 500;
                    const statusColor = isSuccess 
                      ? 'text-green-400' 
                      : isClientErr 
                        ? 'text-yellow-400' 
                        : 'text-red-400';
                    const timestampStr = new Date(log.timestamp).toLocaleTimeString();

                    return (
                      <div key={idx} className="border-b border-neutral-800 pb-1.5 last:border-b-0 last:pb-0 flex items-start gap-1 justify-between">
                        <div className="truncate">
                          <span className="text-neutral-500 font-bold">[{timestampStr}]</span>{' '}
                          <span className="text-blue-400 font-bold uppercase">{log.method}</span>{' '}
                          <span className="text-white hover:text-yellow-300 transition-colors" title={log.path}>
                            {log.path.length > 28 ? log.path.substring(0, 25) + '...' : log.path}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`${statusColor} font-black`}>{log.status}</span>
                          <span className="text-neutral-500">{log.duration}ms</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
