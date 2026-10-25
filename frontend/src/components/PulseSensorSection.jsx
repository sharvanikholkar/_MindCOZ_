import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Heart, 
  Activity, 
  WifiOff, 
  RefreshCw, 
  Sliders, 
  Play, 
  Square, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Trash2,
  Clock,
  Zap
} from 'lucide-react';
import { fetchSensorReading, postSensorReading } from '../services/api';

export default function PulseSensorSection({ onConsultAI }) {
  // Connection Configuration
  const [sourceMode, setSourceMode] = useState('demo'); // 'demo' | 'ip' | 'flask' | 'django'
  const [ipAddress, setIpAddress] = useState('192.168.4.1');
  const [port, setPort] = useState('80');
  const [endpointPath, setEndpointPath] = useState('/pulse');
  const [isConnected, setIsConnected] = useState(true);
  const [pollInterval, setPollInterval] = useState(2000); // ms
  const [isPolling, setIsPolling] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Live Demo Simulation active');
  const [statusType, setStatusType] = useState('success'); // 'success' | 'warning' | 'error' | 'info'

  // Vitals State
  const [heartRate, setHeartRate] = useState(74);
  const [spo2, setSpo2] = useState(98.4);
  const [history, setHistory] = useState([
    { id: 1, time: '12:00:10', heartRate: 72, spo2: 98.2, status: 'Normal' },
    { id: 2, time: '12:00:20', heartRate: 75, spo2: 98.6, status: 'Normal' },
    { id: 3, time: '12:00:30', heartRate: 74, spo2: 98.4, status: 'Normal' },
  ]);

  // Canvas ref for ECG Pulse Waveform
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const wavePointsRef = useRef([]);

  // Compute calculated direct link
  const calculatedUrl = `http://${ipAddress.trim()}${port.trim() ? `:${port.trim()}` : ''}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;

  // Stress Level derivation
  const getStressLevel = (bpm) => {
    if (bpm < 60) return { label: 'Low / Resting', color: 'badge-info', advice: 'Relaxed resting state.' };
    if (bpm <= 85) return { label: 'Optimal / Calm', color: 'badge-optimal', advice: 'Good focus & calm composure.' };
    if (bpm <= 100) return { label: 'Mild Stress / Active', color: 'badge-warning', advice: 'Slightly elevated. Good for task alertness.' };
    return { label: 'High Stress / Fast Pulse', color: 'badge-danger', advice: 'High arousal or stress. Try 2 min breathing.' };
  };

  const stressInfo = getStressLevel(heartRate);

  // Poll logic
  const performFetch = useCallback(async () => {
    if (!isConnected) return;

    if (sourceMode === 'demo') {
      // Realistic biological drift
      const deltaHr = (Math.random() - 0.48) * 3;
      const nextHr = Math.min(125, Math.max(58, Math.round((heartRate + deltaHr) * 10) / 10));
      const deltaSpo2 = (Math.random() - 0.5) * 0.4;
      const nextSpo2 = Math.min(100, Math.max(94, Math.round((spo2 + deltaSpo2) * 10) / 10));

      setHeartRate(nextHr);
      setSpo2(nextSpo2);

      const timestamp = new Date().toLocaleTimeString();
      setHistory(prev => [
        {
          id: Date.now(),
          time: timestamp,
          heartRate: nextHr,
          spo2: nextSpo2,
          status: nextHr > 100 ? 'Elevated' : nextHr < 60 ? 'Low' : 'Normal',
        },
        ...prev.slice(0, 19),
      ]);

      // Sync with Flask backend
      postSensorReading(nextHr, nextSpo2, 'Demo Pulse Simulator').catch(() => {});
      return;
    }

    // Remote or API mode
    try {
      const targetSource = sourceMode === 'ip' ? 'custom' : sourceMode;
      const result = await fetchSensorReading(targetSource, calculatedUrl);

      if (result.success && result.data) {
        const rawHr = result.data.heart_rate ?? result.data.heartRate ?? result.data.bpm;
        const rawSpo2 = result.data.spo2 ?? result.data.oxygen;

        if (rawHr !== undefined) {
          const hrVal = parseFloat(rawHr);
          const spo2Val = rawSpo2 !== undefined ? parseFloat(rawSpo2) : spo2;
          setHeartRate(hrVal);
          if (rawSpo2 !== undefined) setSpo2(spo2Val);

          const timestamp = new Date().toLocaleTimeString();
          setHistory(prev => [
            {
              id: Date.now(),
              time: timestamp,
              heartRate: hrVal,
              spo2: spo2Val,
              status: hrVal > 100 ? 'Elevated' : hrVal < 60 ? 'Low' : 'Normal',
            },
            ...prev.slice(0, 19),
          ]);
          setStatusType('success');
          setStatusMessage(`Received live pulse data at ${timestamp}`);
        }
      } else {
        setStatusType('warning');
        setStatusMessage(result.error || 'Failed to fetch sensor reading');
      }
    } catch (err) {
      setStatusType('error');
      setStatusMessage(`Connection error: ${err.message}`);
    }
  }, [isConnected, sourceMode, calculatedUrl, heartRate, spo2]);

  // Interval polling
  useEffect(() => {
    if (!isPolling || !isConnected) return;
    const timer = setInterval(() => {
      performFetch();
    }, pollInterval);
    return () => clearInterval(timer);
  }, [isPolling, isConnected, pollInterval, performFetch]);

  // ECG Pulse Waveform Rendering on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    let phase = 0;
    const render = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw ECG trace
      const midY = height / 2;
      const speed = isConnected ? (heartRate / 60) * 2.2 : 0.4;
      phase += speed;

      // Compute current ECG pulse value
      let ecgVal = 0;
      const cycle = phase % 100;
      if (cycle > 20 && cycle < 28) ecgVal = Math.sin((cycle - 20) * (Math.PI / 8)) * 8; // P-wave
      else if (cycle >= 35 && cycle < 38) ecgVal = -12; // Q-dip
      else if (cycle >= 38 && cycle < 43) ecgVal = 46; // R-spike
      else if (cycle >= 43 && cycle < 47) ecgVal = -18; // S-dip
      else if (cycle >= 55 && cycle < 68) ecgVal = Math.sin((cycle - 55) * (Math.PI / 13)) * 14; // T-wave

      wavePointsRef.current.push(midY - (isConnected ? ecgVal : 0));
      if (wavePointsRef.current.length > width) {
        wavePointsRef.current.shift();
      }

      ctx.beginPath();
      ctx.strokeStyle = isConnected ? '#f43f5e' : '#64748b';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = isConnected ? 8 : 0;
      ctx.shadowColor = '#f43f5e';

      for (let i = 0; i < wavePointsRef.current.length; i++) {
        const x = i;
        const y = wavePointsRef.current[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lead cursor point
      if (wavePointsRef.current.length > 0) {
        const lastX = wavePointsRef.current.length - 1;
        const lastY = wavePointsRef.current[lastX];
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fda4af';
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isConnected, heartRate]);

  // Simulate manual bump
  const handleSimulatePulse = (newHr, newSpo2) => {
    setHeartRate(newHr);
    setSpo2(newSpo2);
    const timestamp = new Date().toLocaleTimeString();
    setHistory(prev => [
      {
        id: Date.now(),
        time: timestamp,
        heartRate: newHr,
        spo2: newSpo2,
        status: newHr > 100 ? 'Elevated' : newHr < 60 ? 'Low' : 'Normal',
      },
      ...prev.slice(0, 19),
    ]);
    postSensorReading(newHr, newSpo2, 'Manual Test Button').catch(() => {});
    setStatusType('info');
    setStatusMessage(`Injected test reading: ${newHr} BPM, ${newSpo2}% SpO2`);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setStatusType('info');
    setStatusMessage('Reading history cleared.');
  };

  // Preset loaders
  const handleApplyPreset = (type) => {
    if (type === 'esp32_ap') {
      setSourceMode('ip');
      setIpAddress('192.168.4.1');
      setPort('80');
      setEndpointPath('/pulse');
      setStatusType('info');
      setStatusMessage('Preset configured: ESP32 AP Mode (192.168.4.1)');
    } else if (type === 'esp32_lan') {
      setSourceMode('ip');
      setIpAddress('192.168.1.50');
      setPort('80');
      setEndpointPath('/data');
      setStatusType('info');
      setStatusMessage('Preset configured: Local Wi-Fi LAN (192.168.1.50)');
    } else if (type === 'django') {
      setSourceMode('django');
      setStatusType('info');
      setStatusMessage('Connected to Django backend database endpoint (/api/sensor)');
    } else if (type === 'flask') {
      setSourceMode('flask');
      setStatusType('info');
      setStatusMessage('Connected to Flask real-time endpoint (/api/sensor)');
    } else {
      setSourceMode('demo');
      setStatusType('success');
      setStatusMessage('Demo simulation mode activated');
    }
  };

  // Beating heart animation speed style
  const beatDuration = Math.max(0.4, 60 / Math.max(40, heartRate));

  return (
    <section className="sensor-card pulse-sensor-section" id="pulse-sensor-section">
      {/* Section Header */}
      <div className="section-card-header">
        <div className="section-title-wrap">
          <div className="section-icon-badge bg-rose-500/15 text-rose-400">
            <Heart 
              size={22} 
              className={isConnected ? 'animate-heartbeat' : ''} 
              style={{ animationDuration: `${beatDuration}s` }} 
            />
          </div>
          <div>
            <h2 className="section-heading">Pulse Sensor & Heart Rate Telemetry</h2>
            <p className="section-subheading">Live cardiac BPM monitor, SpO2 saturation & stress index</p>
          </div>
        </div>

        <div className="section-header-actions">
          <span className={`status-badge-pill ${isConnected ? 'status-pill-online' : 'status-pill-offline'}`}>
            {isConnected ? (
              <>
                <span className="live-dot" />
                <span>{sourceMode === 'demo' ? 'Demo Mode Active' : 'Sensor Connected'}</span>
              </>
            ) : (
              <>
                <WifiOff size={13} />
                <span>Disconnected</span>
              </>
            )}
          </span>
          <button 
            type="button"
            className={`btn-action-sm ${isConnected ? 'btn-danger-outline' : 'btn-success-solid'}`}
            onClick={() => setIsConnected(!isConnected)}
          >
            {isConnected ? <Square size={13} /> : <Play size={13} />}
            <span>{isConnected ? 'Disconnect' : 'Connect'}</span>
          </button>
        </div>
      </div>

      {/* Connection & IP Address Config Bar */}
      <div className="config-panel">
        <div className="config-header-row">
          <div className="config-title">
            <Sliders size={15} className="text-violet-400" />
            <span>Connection Mode & Device IP:</span>
          </div>

          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-tab-btn ${sourceMode === 'demo' ? 'active' : ''}`}
              onClick={() => handleApplyPreset('demo')}
            >
              Demo Simulator
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${sourceMode === 'ip' ? 'active' : ''}`}
              onClick={() => setSourceMode('ip')}
            >
              Direct ESP32 IP
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${sourceMode === 'flask' ? 'active' : ''}`}
              onClick={() => handleApplyPreset('flask')}
            >
              Flask API
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${sourceMode === 'django' ? 'active' : ''}`}
              onClick={() => handleApplyPreset('django')}
            >
              Django DB
            </button>
          </div>
        </div>

        {/* IP and Link Inputs (visible when direct IP mode is selected) */}
        {sourceMode === 'ip' && (
          <div className="ip-inputs-row">
            <div className="input-field-group">
              <label>Device IP Address:</label>
              <div className="input-with-prefix">
                <span className="input-prefix">http://</span>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="192.168.4.1"
                  className="config-text-input"
                />
              </div>
            </div>

            <div className="input-field-group field-port">
              <label>Port:</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="80"
                className="config-text-input"
              />
            </div>

            <div className="input-field-group field-path">
              <label>Data Path:</label>
              <input
                type="text"
                value={endpointPath}
                onChange={(e) => setEndpointPath(e.target.value)}
                placeholder="/pulse"
                className="config-text-input"
              />
            </div>

            <div className="input-field-group field-url-preview">
              <label>Target URL:</label>
              <div className="url-preview-pill" title={calculatedUrl}>
                <span>{calculatedUrl}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Presets & Control Action Buttons */}
        <div className="controls-actions-row">
          <div className="presets-pill-group">
            <span className="presets-label">Quick Presets:</span>
            <button type="button" className="preset-chip" onClick={() => handleApplyPreset('esp32_ap')}>
              ESP32 AP (192.168.4.1)
            </button>
            <button type="button" className="preset-chip" onClick={() => handleApplyPreset('esp32_lan')}>
              Wi-Fi LAN (192.168.1.50)
            </button>
            <button type="button" className="preset-chip" onClick={() => handleApplyPreset('django')}>
              Django (/api/sensor)
            </button>
          </div>

          <div className="actions-button-group">
            <button
              type="button"
              className="btn-control btn-secondary"
              onClick={performFetch}
              disabled={!isConnected}
              title="Perform immediate manual poll"
            >
              <RefreshCw size={14} />
              <span>Fetch Now</span>
            </button>

            <button
              type="button"
              className={`btn-control ${isPolling ? 'btn-active-poll' : 'btn-secondary'}`}
              onClick={() => setIsPolling(!isPolling)}
              disabled={!isConnected}
              title="Toggle automatic interval polling"
            >
              <Activity size={14} />
              <span>{isPolling ? `Polling (${pollInterval / 1000}s)` : 'Polling: OFF'}</span>
            </button>

            <div className="quick-inject-buttons">
              {[1000, 2000, 5000].map(ms => (
                <button
                  key={ms}
                  type="button"
                  className={`btn-control btn-test ${pollInterval === ms ? 'btn-active-poll' : ''}`}
                  onClick={() => setPollInterval(ms)}
                  title={`Poll interval: ${ms / 1000}s`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>

            {/* Test Simulation Buttons */}
            <div className="quick-inject-buttons">
              <button
                type="button"
                className="btn-control btn-test"
                onClick={() => handleSimulatePulse(72, 98.6)}
                title="Simulate normal heart rate"
              >
                72 BPM
              </button>
              <button
                type="button"
                className="btn-control btn-test"
                onClick={() => handleSimulatePulse(92, 97.4)}
                title="Simulate active study pulse"
              >
                92 BPM
              </button>
              <button
                type="button"
                className="btn-control btn-test btn-test-high"
                onClick={() => handleSimulatePulse(110, 96.2)}
                title="Simulate exam stress pulse"
              >
                110 BPM (Stress)
              </button>
            </div>
          </div>
        </div>

        {/* Status notification banner */}
        {statusMessage && (
          <div className={`config-status-alert alert-${statusType}`}>
            {statusType === 'success' && <CheckCircle2 size={14} />}
            {statusType === 'warning' && <AlertCircle size={14} />}
            {statusType === 'error' && <AlertCircle size={14} />}
            {statusType === 'info' && <Zap size={14} />}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Real-Time Metrics & Gauge Cards Grid */}
      <div className="metrics-dashboard-grid">
        {/* Heart Rate Card */}
        <div className="metric-card card-heart-rate">
          <div className="metric-header">
            <div className="metric-label-group">
              <Heart 
                size={20} 
                className="text-rose-400 animate-heartbeat" 
                style={{ animationDuration: `${beatDuration}s` }} 
              />
              <span className="metric-title">Heart Rate</span>
            </div>
            <span className={`badge-metric ${heartRate > 100 ? 'badge-danger' : heartRate < 60 ? 'badge-warning' : 'badge-success'}`}>
              {heartRate > 100 ? 'Elevated' : heartRate < 60 ? 'Bradycardia' : 'Normal'}
            </span>
          </div>

          <div className="metric-value-row">
            <span className="metric-value text-rose-400">{heartRate}</span>
            <span className="metric-unit">BPM</span>
          </div>

          <div className="metric-footer">
            <div className="metric-scale-bar">
              <div 
                className="scale-bar-fill fill-rose" 
                style={{ width: `${Math.min(100, Math.max(10, ((heartRate - 40) / 120) * 100))}%` }} 
              />
            </div>
            <div className="metric-bounds">
              <span>40 BPM</span>
              <span>Target: 60-100</span>
              <span>160 BPM</span>
            </div>
          </div>
        </div>

        {/* SpO2 Blood Oxygen Card */}
        <div className="metric-card card-spo2">
          <div className="metric-header">
            <div className="metric-label-group">
              <Activity size={20} className="text-cyan-400" />
              <span className="metric-title">Blood Oxygen (SpO2)</span>
            </div>
            <span className={`badge-metric ${spo2 < 95 ? 'badge-warning' : 'badge-success'}`}>
              {spo2 >= 95 ? 'Optimal' : 'Low'}
            </span>
          </div>

          <div className="metric-value-row">
            <span className="metric-value text-cyan-400">{spo2}</span>
            <span className="metric-unit">%</span>
          </div>

          <div className="metric-footer">
            <div className="metric-scale-bar">
              <div 
                className="scale-bar-fill fill-cyan" 
                style={{ width: `${Math.min(100, Math.max(10, ((spo2 - 85) / 15) * 100))}%` }} 
              />
            </div>
            <div className="metric-bounds">
              <span>85%</span>
              <span>Normal: 95-100%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Stress & Focus Evaluation Card */}
        <div className="metric-card card-stress">
          <div className="metric-header">
            <div className="metric-label-group">
              <Sparkles size={20} className="text-violet-400" />
              <span className="metric-title">Academic Stress Index</span>
            </div>
            <span className={`badge-metric ${stressInfo.color}`}>
              {stressInfo.label}
            </span>
          </div>

          <div className="stress-advice-content">
            <p className="stress-advice-text">{stressInfo.advice}</p>
            <div className="stress-action-wrap">
              <button
                type="button"
                className="btn-ai-consult"
                onClick={() => onConsultAI && onConsultAI(`My current pulse rate is ${heartRate} BPM with ${spo2}% SpO2 (${stressInfo.label}). Please give me customized advice for study focus and stress management.`)}
              >
                <Sparkles size={14} />
                <span>Ask MentaBot AI About Vitals</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic ECG Pulse Oscilloscope Waveform Display */}
      <div className="oscilloscope-wrapper">
        <div className="oscilloscope-header">
          <div className="oscilloscope-title">
            <Activity size={15} className="text-rose-400" />
            <span>Real-Time Pulse Waveform (ECG Visualizer)</span>
          </div>
          <div className="oscilloscope-stats">
            <span>Sweep: 25mm/s</span>
            <span>BPM: {heartRate}</span>
            <span className="text-emerald-400">● Live Trace</span>
          </div>
        </div>

        <div className="oscilloscope-canvas-box">
          <canvas ref={canvasRef} className="ecg-canvas" />
        </div>
      </div>

      {/* Recent Telemetry Readings Log Table */}
      <div className="history-table-container">
        <div className="history-header">
          <div className="history-title">
            <Clock size={15} className="text-slate-400" />
            <span>Recent Sensor Readings ({history.length} captured)</span>
          </div>
          {history.length > 0 && (
            <button type="button" className="btn-clear-history" onClick={handleClearHistory}>
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-history-notice">
            <span>No readings recorded yet. Click &quot;Fetch Now&quot; or start polling.</span>
          </div>
        ) : (
          <div className="table-scroll-wrapper">
            <table className="telemetry-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Heart Rate</th>
                  <th>SpO2</th>
                  <th>Cardiac Status</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 8).map((item) => (
                  <tr key={item.id}>
                    <td>{item.time}</td>
                    <td className="font-semibold text-rose-300">{item.heartRate} BPM</td>
                    <td className="font-semibold text-cyan-300">{item.spo2}%</td>
                    <td>
                      <span className={`status-pill-subtle ${item.status === 'Normal' ? 'status-pill-green' : item.status === 'Elevated' ? 'status-pill-amber' : 'status-pill-blue'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
