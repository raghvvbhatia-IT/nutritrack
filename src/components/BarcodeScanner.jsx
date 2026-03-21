import { useState, useEffect, useRef } from 'react'

// MacroFactor palette
const C = {
  bg: '#0A0A0A',
  surface: '#111111',
  border: '#1E1E1E',
  text: '#FFFFFF',
  secondary: '#888888',
  muted: '#555555',
  accent: '#0170B9',
}

const SCAN_LINE_STYLE = `
  @keyframes scanline {
    0%   { top: 10%; }
    50%  { top: 85%; }
    100% { top: 10%; }
  }
  .nt-scanline {
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, #0170B9 20%, #4DB8FF 50%, #0170B9 80%, transparent 100%);
    box-shadow: 0 0 8px 2px rgba(1,112,185,0.7);
    animation: scanline 2s ease-in-out infinite;
  }
`

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const detectorRef = useRef(null)

  const [mode, setMode] = useState('init') // 'init' | 'camera' | 'file' | 'manual' | 'error'
  const [statusMsg, setStatusMsg] = useState('Starting camera…')
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [cameraError, setCameraError] = useState('')

  // Check BarcodeDetector support
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

  useEffect(() => {
    if (!hasBarcodeDetector) {
      setMode('file')
      setStatusMsg('Camera scanning not supported on this browser. Use file input or manual entry.')
      return
    }

    startCamera()
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      detectorRef.current = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix'],
      })

      setMode('camera')
      setStatusMsg('Point camera at barcode')

      // Poll every 500ms
      intervalRef.current = setInterval(() => scanFrame(), 500)
    } catch (err) {
      setCameraError(err.message || 'Camera access denied')
      setMode('file')
      setStatusMsg('Camera unavailable. Use file input or manual entry.')
    }
  }

  function stopCamera() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  async function scanFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    try {
      const barcodes = await detectorRef.current.detect(canvas)
      if (barcodes && barcodes.length > 0) {
        const code = barcodes[0].rawValue
        stopCamera()
        onResult(code)
      }
    } catch {
      // ignore detection errors
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!hasBarcodeDetector) {
      // Can't detect — fall through to manual
      setShowManual(true)
      setStatusMsg('Barcode detection not available. Please enter barcode manually.')
      return
    }
    setStatusMsg('Scanning image…')
    try {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = async () => {
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        try {
          if (!detectorRef.current) {
            detectorRef.current = new window.BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
            })
          }
          const barcodes = await detectorRef.current.detect(canvas)
          if (barcodes && barcodes.length > 0) {
            onResult(barcodes[0].rawValue)
          } else {
            setStatusMsg('No barcode found in image. Try another photo or enter manually.')
            setShowManual(true)
          }
        } catch {
          setStatusMsg('Could not scan image. Enter barcode manually.')
          setShowManual(true)
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        setStatusMsg('Could not load image.')
        setShowManual(true)
      }
      img.src = url
    } catch {
      setStatusMsg('Error reading file.')
      setShowManual(true)
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    const barcode = manualInput.trim()
    if (!barcode) return
    stopCamera()
    onResult(barcode)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: C.bg,
      position: 'relative',
    }}>
      <style>{SCAN_LINE_STYLE}</style>

      {/* Canvas (hidden, used for frame capture) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera viewfinder */}
      {mode === 'camera' && (
        <div style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: '#000',
          minHeight: 0,
        }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {/* Dark overlay with cutout hint */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            {/* Scan frame corners */}
            <div style={{
              position: 'relative',
              width: 240,
              height: 160,
            }}>
              {/* Top-left */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: 28, height: 28, borderTop: '3px solid #fff', borderLeft: '3px solid #fff', borderRadius: '4px 0 0 0' }} />
              {/* Top-right */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderTop: '3px solid #fff', borderRight: '3px solid #fff', borderRadius: '0 4px 0 0' }} />
              {/* Bottom-left */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: 28, height: 28, borderBottom: '3px solid #fff', borderLeft: '3px solid #fff', borderRadius: '0 0 0 4px' }} />
              {/* Bottom-right */}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderBottom: '3px solid #fff', borderRight: '3px solid #fff', borderRadius: '0 0 4px 0' }} />
              {/* Animated scan line */}
              <div className="nt-scanline" />
            </div>
          </div>
        </div>
      )}

      {/* File fallback when no camera */}
      {mode === 'file' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          gap: 20,
        }}>
          {/* Barcode icon */}
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5">
            <path d="M3 9V6a2 2 0 012-2h2M3 15v3a2 2 0 002 2h2M15 3h2a2 2 0 012 2v3M15 21h2a2 2 0 002-2v-3" />
            <path d="M7 8v8M10 8v8M13 8v8M16 8v8" />
          </svg>

          {cameraError && (
            <div style={{ fontSize: 13, color: '#E86F6F', textAlign: 'center' }}>{cameraError}</div>
          )}

          <div style={{ fontSize: 14, color: C.secondary, textAlign: 'center', lineHeight: 1.5 }}>
            {statusMsg}
          </div>

          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: C.accent,
            borderRadius: 12,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Take / Choose Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {/* Status bar at bottom of camera view */}
      {mode === 'camera' && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(0,0,0,0.85)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: C.secondary }}>{statusMsg}</div>
        </div>
      )}

      {/* Manual entry section */}
      <div style={{ padding: '12px 20px 8px', background: C.bg }}>
        {!showManual ? (
          <button
            onClick={() => setShowManual(true)}
            style={{
              background: 'none',
              border: 'none',
              color: C.muted,
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '4px 0',
              fontFamily: 'inherit',
            }}
          >
            Enter barcode manually
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter barcode number"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: '#161616',
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '11px 14px',
                color: C.text,
                fontSize: 15,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: C.accent,
                border: 'none',
                borderRadius: 10,
                padding: '11px 18px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Look up
            </button>
          </form>
        )}
      </div>

      {/* Bottom safe area */}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: C.bg }} />
    </div>
  )
}
