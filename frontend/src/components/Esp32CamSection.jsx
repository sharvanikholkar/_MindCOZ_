import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Video, VideoOff, Play, Square, Maximize2, Download, RotateCw, FlipHorizontal, ExternalLink, Copy, Check, Trash2, Crosshair, Sliders, AlertCircle, Sparkles } from 'lucide-react';

export default function Esp32CamSection() {
  // Connection and link configuration
  const [ipAddress, setIpAddress] = useState('192.168.4.1');
  const [port, setPort] = useState('81');
  const [streamPath, setStreamPath] = useState('/stream');

  // State control: true means streaming is currently running
  const [isStreaming, setIsStreaming] = useState(true);
  // Defaulting isDemoFeed to false since we want to run hardware/laptop cameras by default
  const [isDemoFeed, setIsDemoFeed] = useState(false);

  // High-level mode tracker: true when running the live ESP32 network feed
  const [isLiveEsp32Active, setIsLiveEsp32Active] = useState(false);

  const [streamKey, setStreamKey] = useState(0);
  const [hasStreamError, setHasStreamError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Video display settings
  const [showCrosshairs, setShowCrosshairs] = useState(true);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isMirrored, setIsMirrored] = useState(false);
  const [fps, setFps] = useState(25);
  const [resolution, setResolution] = useState('VGA (640x480)');

  // Snapshot Gallery
  const [snapshots, setSnapshots] = useState([
    {
      id: 1,
      time: '12:00:15',
      dataUrl: null,
      caption: 'Sample Baseline Snapshot',
    },
  ]);

  // Viewport and Element references
  const containerRef = useRef(null);
  const demoCanvasRef = useRef(null);
  const laptopVideoRef = useRef(null);
  const animationRef = useRef(null);
  const localStreamRef = useRef(null);

  // Compute calculated direct link
  const calculatedStreamUrl = `http://${ipAddress.trim()}${port.trim() ? `:${port.trim()}` : ''}${streamPath.startsWith('/') ? streamPath : `/${streamPath}`}`;

  // Handle local laptop webcam lifecycle
  useEffect(() => {
    // Only activate laptop camera if streaming is on, demo feed is off, and ESP32 stream is NOT active
    const shouldShowLaptopCam = isStreaming && !isDemoFeed && !isLiveEsp32Active;

    if (shouldShowLaptopCam) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          localStreamRef.current = stream;
          if (laptopVideoRef.current) {
            laptopVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing laptop webcam: ", err);
        });
    } else {
      // Clean up and turn off laptop webcam when switching states
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (laptopVideoRef.current) {
        laptopVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isStreaming, isDemoFeed, isLiveEsp32Active]);

  // Demo Feed Animation Generator (draws a realistic ESP32-CAM test pattern and moving targets)
  useEffect(() => {
    if (!isDemoFeed || !isStreaming) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = demoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = 640);
    const height = (canvas.height = 480);
    let frame = 0;
    let targetX = 320;
    let targetY = 240;
    let dx = 2.5;
    let dy = 1.8;

    const renderDemo = () => {
      frame++;
      // Subtle gradient background simulating lab/desk camera lighting
      const bgGrad = ctx.createRadialGradient(320, 240, 50, 320, 240, 380);
      bgGrad.addColorStop(0, '#1e293b');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Faint video noise
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let i = 0; i < 400; i++) {
        const nx = Math.random() * width;
        const ny = Math.random() * height;
        ctx.fillRect(nx, ny, 2, 2);
      }

      // Moving target simulation (student face / object tracker)
      targetX += dx;
      targetY += dy;
      if (targetX < 120 || targetX > 520) dx = -dx;
      if (targetY < 90 || targetY > 390) dy = -dy;

      // Draw bounding box
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(targetX - 70, targetY - 80, 140, 160);
      ctx.setLineDash([]);

      // Corner markers on bounding box
      const cornerLen = 15;
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(targetX - 70, targetY - 80 + cornerLen);
      ctx.lineTo(targetX - 70, targetY - 80);
      ctx.lineTo(targetX - 70 + cornerLen, targetY - 80);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(targetX + 70 - cornerLen, targetY - 80);
      ctx.lineTo(targetX + 70, targetY - 80);
      ctx.lineTo(targetX + 70, targetY - 80 + cornerLen);
      ctx.stroke();

      // Target Label
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('DETECTED: Student Head Pose (98%)', targetX - 68, targetY - 88);

      // Center crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(320, 210);
      ctx.lineTo(320, 270);
      ctx.moveTo(290, 240);
      ctx.lineTo(350, 240);
      ctx.stroke();

      // Timestamp & HUD text
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '13px monospace';
      ctx.fillText(`CAM-01 [ESP32-CAM] ${nowStr} REC`, 20, 30);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(360, 26, 5, 0, Math.PI * 2);
      ctx.fill();

      // Resolution watermark and frame counter
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(`RES: ${resolution} FPS: ${fps}.0 FRAME: #${frame}`, 20, height - 20);

      animationRef.current = requestAnimationFrame(renderDemo);
    };

    animationRef.current = requestAnimationFrame(renderDemo);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isDemoFeed, isStreaming, resolution, fps]);

  // Capture Snapshot
  const handleCaptureSnapshot = useCallback(() => {
    let capturedUrl = null;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    if (isDemoFeed && demoCanvasRef.current) {
      capturedUrl = demoCanvasRef.current.toDataURL('image/jpeg');
    } else if (isLiveEsp32Active) {
      const imgElem = document.getElementById('esp32-stream-img');
      if (imgElem && imgElem.complete && imgElem.naturalWidth > 0) {
        try {
          ctx.drawImage(imgElem, 0, 0, 640, 480);
          capturedUrl = canvas.toDataURL('image/jpeg');
        } catch {
          capturedUrl = `${calculatedStreamUrl}?_t=${Date.now()}`;
        }
      } else {
        capturedUrl = `${calculatedStreamUrl}?_t=${Date.now()}`;
      }
    } else if (laptopVideoRef.current) {
      // Capture frame from local laptop video stream
      try {
        ctx.drawImage(laptopVideoRef.current, 0, 0, 640, 480);
        capturedUrl = canvas.toDataURL('image/jpeg');
      } catch (err) {
        console.error("Failed to capture snapshot from laptop camera", err);
      }
    }

    if (capturedUrl) {
      const newSnapshot = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        dataUrl: capturedUrl,
        caption: `Capture @ ${new Date().toLocaleTimeString()}`,
      };
      setSnapshots(prev => [newSnapshot, ...prev]);
    }
  }, [isDemoFeed, isLiveEsp32Active, calculatedStreamUrl]);

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  // Copy Link to Clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(calculatedStreamUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Preset Configurations
  const handleApplyPreset = (type) => {
    if (type === 'esp32_ap_stream') {
      setIsDemoFeed(false);
      setIsLiveEsp32Active(true);
      setIpAddress('192.168.4.1');
      setPort('81');
      setStreamPath('/stream');
      setIsStreaming(true);
      setHasStreamError(false);
      setStreamKey(prev => prev + 1);
    } else if (type === 'esp32_lan_stream') {
      setIsDemoFeed(false);
      setIsLiveEsp32Active(true);
      setIpAddress('192.168.1.50');
      setPort('81');
      setStreamPath('/stream');
      setIsStreaming(true);
      setHasStreamError(false);
      setStreamKey(prev => prev + 1);
    } else if (type === 'esp32_snapshot') {
      setIsDemoFeed(false);
      setIsLiveEsp32Active(true);
      setIpAddress('192.168.1.50');
      setPort('80');
      setStreamPath('/capture');
      setIsStreaming(true);
      setHasStreamError(false);
      setStreamKey(prev => prev + 1);
    } else if (type === 'laptop') {
      setIsDemoFeed(false);
      setIsLiveEsp32Active(false);
      setIsStreaming(true);
    } else {
      setIsDemoFeed(true);
      setIsLiveEsp32Active(false);
      setIsStreaming(true);
      setHasStreamError(false);
    }
  };

  const handleDeleteSnapshot = (id) => {
    setSnapshots(prev => prev.filter(snap => Number(snap.id) !== Number(id)));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <section className="sensor-card esp32cam-section" id="esp32cam-section">
      {/* Section Header */}
      <div className="section-card-header">
        <div className="section-title-wrap">
          <div className="section-icon-badge bg-sky-500/15 text-sky-400">
            <Camera size={22} />
          </div>
          <div>
            <h2 className="section-heading">ESP32-CAM Video Stream & Optical Sensor</h2>
            <p className="section-subheading">Real-time camera view monitoring dashboard</p>
          </div>
        </div>
        <div className="section-header-actions">
          <span className={`status-badge-pill ${isStreaming ? (isDemoFeed ? 'status-pill-demo' : (isLiveEsp32Active ? 'status-pill-online' : 'status-pill-laptop')) : 'status-pill-offline'}`}>
            {isStreaming ? (
              <>
                <span className="live-dot" />
                <span>
                  {isDemoFeed && 'Demo Stream Active'}
                  {isLiveEsp32Active && !isDemoFeed && 'Live ESP32-CAM Feed'}
                  {!isLiveEsp32Active && !isDemoFeed && 'Default Laptop Webcam'}
                </span>
              </>
            ) : (
              <>
                <VideoOff size={13} />
                <span>Camera Standby</span>
              </>
            )}
          </span>
          <button
            type="button"
            className={`btn-action-sm ${isStreaming ? 'btn-danger-outline' : 'btn-success-solid'}`}
            onClick={() => setIsStreaming(!isStreaming)}
          >
            {isStreaming ? <Square size={13} /> : <Play size={13} />}
            <span>{isStreaming ? 'Stop Stream' : 'Start Stream'}</span>
          </button>
        </div>
      </div>

      {/* Connection & IP Address Link Bar */}
      <div className="config-panel">
        <div className="config-header-row">
          <div className="config-title">
            <Sliders size={15} className="text-sky-400" />
            <span>Camera Input Channel Setup:</span>
          </div>
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-tab-btn ${!isDemoFeed && !isLiveEsp32Active ? 'active' : ''}`}
              onClick={() => handleApplyPreset('laptop')}
            >
              <Video size={13} className="mr-1 inline" /> Built-in Webcam
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${isLiveEsp32Active && !isDemoFeed ? 'active' : ''}`}
              onClick={() => handleApplyPreset('esp32_ap_stream')}
            >
              <Camera size={13} className="mr-1 inline" /> ESP32-CAM Hardware Feed
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${isDemoFeed ? 'active' : ''}`}
              onClick={() => handleApplyPreset('demo')}
            >
              <Sparkles size={13} className="mr-1 inline" /> Test Pattern
            </button>
          </div>
        </div>

        {/* IP and Link Details Inputs */}
        <div className="ip-inputs-row">
          <div className="input-field-group">
            <label>ESP32 IP Address:</label>
            <div className="input-with-prefix">
              <span className="input-prefix">http://</span>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => {
                  setIpAddress(e.target.value);
                  setIsLiveEsp32Active(true);
                  setIsDemoFeed(false);
                }}
                placeholder="192.168.4.1"
                className="config-text-input"
              />
            </div>
          </div>
          <div className="input-field-group field-port">
            <label>Stream Port:</label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="81"
              className="config-text-input"
            />
          </div>
          <div className="input-field-group field-path">
            <label>Stream Path:</label>
            <input
              type="text"
              value={streamPath}
              onChange={(e) => setStreamPath(e.target.value)}
              placeholder="/stream"
              className="config-text-input"
            />
          </div>
          <div className="input-field-group field-url-preview">
            <label>Calculated Direct Link:</label>
            <div className="url-copy-box">
              <span className="url-text" title={calculatedStreamUrl}>{calculatedStreamUrl}</span>
              <button
                type="button"
                className="btn-copy-link"
                onClick={handleCopyLink}
                title="Copy stream link to clipboard"
              >
                {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
              <a href={calculatedStreamUrl} target="_blank" rel="noreferrer" className="btn-copy-link" title="Open stream in new tab">
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Quick Presets & Stream Control Action Buttons */}
        <div className="controls-actions-row">
          <div className="presets-pill-group">
            <span className="presets-label">Quick Stream Toggle:</span>
            <button type="button" className="preset-chip" onClick={() => handleApplyPreset('laptop')}>
              Laptop Cam (Default)
            </button>
            <button type="button" className="preset-chip" onClick={() => handleApplyPreset('esp32_ap_stream')}>
              ESP32 AP Stream
            </button>
            <button type="button" className="preset-chip" onClick={() => handleApplyPreset('esp32_lan_stream')}>
              LAN Wi-Fi Stream
            </button>
          </div>
          <div className="actions-button-group">
            <button
              type="button"
              className="btn-control btn-snapshot"
              onClick={handleCaptureSnapshot}
              disabled={!isStreaming}
              title="Capture snapshot frame from camera"
            >
              <Camera size={14} />
              <span>Capture Snapshot</span>
            </button>
            <button type="button" className="btn-control btn-secondary" onClick={handleRotate} title="Rotate stream 90 degrees">
              <RotateCw size={14} />
              <span>Rotate ({rotation}°)</span>
            </button>
            <button
              type="button"
              className={`btn-control ${isMirrored ? 'btn-active-poll' : 'btn-secondary'}`}
              onClick={() => setIsMirrored(!isMirrored)}
              title="Flip horizontal / mirror"
            >
              <FlipHorizontal size={14} />
              <span>Mirror</span>
            </button>
            <button
              type="button"
              className={`btn-control ${showCrosshairs ? 'btn-active-poll' : 'btn-secondary'}`}
              onClick={() => setShowCrosshairs(!showCrosshairs)}
              title="Toggle target crosshairs overlay"
            >
              <Crosshair size={14} />
              <span>Crosshair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Camera Viewport Screen */}
      <div className="cam-viewport-container" ref={containerRef}>
        <div className="cam-viewport-frame">
          {/* Overlaid HUD status bar */}
          <div className="viewport-hud-top">
            <div className="hud-badge-group">
              <span className={`hud-badge ${isStreaming ? 'hud-live' : 'hud-standby'}`}>
                {isStreaming ? (isDemoFeed ? 'DEMO PATTERN' : (isLiveEsp32Active ? 'LIVE ESP32 FEED' : 'LAPTOP WEBCAM')) : 'STANDBY'}
              </span>
              <span className="hud-badge hud-res">{resolution}</span>
              <span className="hud-badge hud-fps">{isStreaming ? `${fps} FPS` : '0 FPS'}</span>
            </div>
            <div className="hud-actions">
              <button type="button" className="btn-hud-icon" onClick={handleToggleFullscreen} title="Toggle Fullscreen">
                <Maximize2 size={15} />
              </button>
            </div>
          </div>

          {/* Video / Stream Element */}
          <div
            className="video-screen-wrapper"
            style={{
              transform: `rotate(${rotation}deg) scaleX(${isMirrored ? "-1" : 1})`,
              transition: 'transform 0.25s ease',
            }}
          >
            {isStreaming ? (
              isDemoFeed ? (
                <canvas ref={demoCanvasRef} className="cam-canvas-display" />
              ) : isLiveEsp32Active ? (
                <>
                  <img
                    id="esp32-stream-img"
                    key={streamKey}
                    src={calculatedStreamUrl}
                    alt="ESP32-CAM MJPEG Stream"
                    className="cam-image-stream"
                    onError={() => setHasStreamError(true)}
                    onLoad={() => setHasStreamError(false)}
                  />
                  {hasStreamError && (
                    <div className="stream-error-overlay">
                      <AlertCircle size={36} className="text-amber-400 mb-2" />
                      <h4>Connecting to ESP32-CAM at {calculatedStreamUrl}...</h4>
                      <p>Ensure your hardware module is powered up and on this network link.</p>
                      <div className="error-actions-row">
                        <button
                          type="button"
                          className="btn-action-sm btn-success-solid"
                          onClick={() => {
                            setHasStreamError(false);
                            setStreamKey(prev => prev + 1);
                          }}
                        >
                          Retry Connection
                        </button>
                        <button type="button" className="btn-action-sm btn-secondary" onClick={() => handleApplyPreset('laptop')}>
                          Back to Laptop Camera
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Native browser-managed laptop camera feed output */
                <video
                  ref={laptopVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="cam-image-stream"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              )
            ) : (
              <div className="cam-standby-screen">
                <VideoOff size={44} className="text-slate-500 mb-3" />
                <h3 className="standby-title">Camera System Offline</h3>
                <p className="standby-desc">The video capture pipeline is paused.</p>
                <div className="standby-actions">
                  <button type="button" className="btn-action-sm btn-success-solid" onClick={() => setIsStreaming(true)}>
                    <Play size={14} className="mr-1" /> Wake Cameras
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Crosshair Overlay */}
          {showCrosshairs && isStreaming && (
            <div className="crosshairs-overlay pointer-events-none">
              <div className="crosshair-center-reticle" />
              <div className="crosshair-v-line" />
              <div className="crosshair-h-line" />
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Gallery Carousel */}
      <div className="snapshots-gallery-wrapper">
        <div className="snapshots-header">
          <div className="snapshots-title">
            <Camera size={15} className="text-sky-400" />
            <span>Captured Gallery Snapshots ({snapshots.length})</span>
          </div>
        </div>
        {snapshots.length === 0 ? (
          <div className="empty-history-notice">
            <span>No snapshots captured yet.</span>
          </div>
        ) : (
          <div className="snapshots-grid">
            {snapshots.map((snap) => (
              <div key={snap.id} className="snapshot-card">
                <div className="snapshot-preview-box">
                  {snap.dataUrl ? (
                    <img src={snap.dataUrl} alt={snap.caption} className="snapshot-img" />
                  ) : (
                    <div className="snapshot-placeholder">
                      <Camera size={24} className="text-slate-500" />
                      <span>{snap.caption}</span>
                    </div>
                  )}
                </div>
                <div className="snapshot-footer">
                  <span className="snapshot-time">{snap.time}</span>
                  <div className="snapshot-btns">
                    {snap.dataUrl && (
                      <a href={snap.dataUrl} download={`snapshot_${snap.id}.jpg`} className="btn-snap-action" title="Download snapshot">
                        <Download size={13} />
                      </a>
                    )}
                    <button type="button" className="btn-snap-action btn-snap-delete" onClick={() => handleDeleteSnapshot(snap.id)} title="Delete snapshot">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}




