import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']

const C = {
  bg: '#0A0A0A',
  surface: '#111111',
  border: '#1E1E1E',
  text: '#FFFFFF',
  secondary: '#888888',
  muted: '#444444',
  protein: '#4B96F3',
  carbs: '#F4A242',
  fat: '#E86F6F',
  accent: '#0170B9',
}

function compressImage(dataUrl, maxWidth = 1024, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const compressed = canvas.toDataURL('image/jpeg', quality)
      resolve(compressed)
    }
    img.src = dataUrl
  })
}

function stripDataUrlPrefix(dataUrl) {
  // Returns only the base64 part after the comma
  return dataUrl.split(',')[1] || ''
}

// Corner brackets overlay for the viewfinder
function ViewfinderBrackets() {
  const bracketColor = 'rgba(255,255,255,0.85)'
  const size = 22
  const thickness = 3
  const radius = 6
  const cornerStyle = (pos) => ({
    position: 'absolute',
    width: size,
    height: size,
    ...pos,
  })
  const svgBracket = (rotation) => (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path
        d={`M ${radius} ${thickness / 2} Q ${thickness / 2} ${thickness / 2} ${thickness / 2} ${radius} L ${thickness / 2} ${size - thickness / 2}`}
        fill="none"
        stroke={bracketColor}
        strokeWidth={thickness}
        strokeLinecap="round"
      />
    </svg>
  )

  return (
    <>
      <div style={{ ...cornerStyle({ top: 16, left: 16 }) }}>{svgBracket(0)}</div>
      <div style={{ ...cornerStyle({ top: 16, right: 16 }) }}>{svgBracket(90)}</div>
      <div style={{ ...cornerStyle({ bottom: 16, right: 16 }) }}>{svgBracket(180)}</div>
      <div style={{ ...cornerStyle({ bottom: 16, left: 16 }) }}>{svgBracket(270)}</div>
    </>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 44, height: 44,
      border: `3px solid #1E1E1E`,
      borderTop: `3px solid ${C.accent}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

export default function CameraCapture({ onAdd, onClose, defaultMeal = 'Breakfast' }) {
  const [step, setStep] = useState('camera') // camera | upload | preview | analysing | result
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [meal, setMeal] = useState(defaultMeal)
  const [result, setResult] = useState(null) // { name, calories, protein, carbs, fat, description }
  const [editResult, setEditResult] = useState(null)
  const [analysisError, setAnalysisError] = useState('')

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.warn('Camera not available:', err)
      setStep('upload')
    }
  }, [])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (step === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      if (step === 'camera') stopCamera()
    }
  }, [step, startCamera, stopCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  function captureFromVideo() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    stopCamera()
    setImageDataUrl(dataUrl)
    setStep('preview')
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImageDataUrl(ev.target.result)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }

  async function analyse() {
    if (!imageDataUrl) return
    setStep('analysing')
    setAnalysisError('')

    try {
      const compressed = await compressImage(imageDataUrl, 1024, 0.75)
      const imageBase64 = stripDataUrlPrefix(compressed)

      const { data, error } = await supabase.functions.invoke('analyze-food-image', {
        body: { imageBase64, mediaType: 'image/jpeg' },
      })

      if (error) throw new Error(error.message || 'Analysis failed')
      if (data?.error) throw new Error(data.error)

      const parsed = {
        name: data.name || 'Unknown food',
        description: data.description || '',
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fat: Number(data.fat) || 0,
        confidence: data.confidence || 'medium',
        quantity: Number(data.quantity) || 100,
      }
      setResult(parsed)
      setEditResult({ ...parsed })
      setStep('result')
    } catch (err) {
      setAnalysisError(err.message || 'Analysis failed. Please try again.')
      setStep('preview')
    }
  }

  function handleAddToLog() {
    if (!editResult) return
    onAdd({
      name: editResult.name,
      meal,
      quantity: editResult.quantity || 100,
      calories: Math.round(Number(editResult.calories) || 0),
      protein: parseFloat((Number(editResult.protein) || 0).toFixed(1)),
      carbs: parseFloat((Number(editResult.carbs) || 0).toFixed(1)),
      fat: parseFloat((Number(editResult.fat) || 0).toFixed(1)),
    })
  }

  function updateEdit(field, value) {
    setEditResult((prev) => ({ ...prev, [field]: value }))
  }

  // Inject keyframe animation for spinner
  const spinKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <style>{spinKeyframes}</style>

      {/* Camera step */}
      {step === 'camera' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Viewfinder */}
          <div style={{
            position: 'relative',
            flex: 1,
            background: '#000',
            overflow: 'hidden',
            margin: '12px 20px 0',
            borderRadius: 16,
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <ViewfinderBrackets />
          </div>

          {/* Capture controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
            padding: '24px 20px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          }}>
            {/* Switch to upload */}
            <button
              onClick={() => setStep('upload')}
              style={{
                background: '#1A1A1A', border: `1px solid ${C.border}`,
                color: C.secondary, borderRadius: 12,
                padding: '10px 16px', fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Upload
            </button>

            {/* Capture button */}
            <button
              onClick={captureFromVideo}
              style={{
                width: 70, height: 70,
                borderRadius: '50%',
                border: '3px solid #fff',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{
                width: 56, height: 56,
                borderRadius: '50%',
                background: '#fff',
              }} />
            </button>

            {/* Placeholder for symmetry */}
            <div style={{ width: 80 }} />
          </div>
        </div>
      )}

      {/* Upload step */}
      {step === 'upload' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          gap: 16,
        }}>
          <div style={{
            width: 72, height: 72,
            background: '#1A1A1A',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 8,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.secondary} strokeWidth="1.8">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>
              Camera not available
            </div>
            <div style={{ fontSize: 13, color: C.secondary, lineHeight: 1.5 }}>
              Select a photo from your gallery to analyse
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: C.accent, border: 'none',
              borderRadius: 14, padding: '13px 28px',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              marginTop: 8,
            }}
          >
            Choose Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => setStep('camera')}
            style={{
              background: 'none', border: 'none',
              color: C.secondary, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try camera again
          </button>
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && imageDataUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
            margin: '12px 20px 0',
            borderRadius: 16,
            background: '#000',
          }}>
            <img
              src={imageDataUrl}
              alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {analysisError && (
            <div style={{ color: C.fat, fontSize: 13, textAlign: 'center', padding: '10px 20px 0' }}>
              {analysisError}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: 12,
            padding: '16px 20px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          }}>
            <button
              onClick={() => {
                setImageDataUrl(null)
                setAnalysisError('')
                setStep('camera')
              }}
              style={{
                flex: 1,
                background: '#1A1A1A', border: `1px solid ${C.border}`,
                color: C.text, borderRadius: 14,
                padding: '14px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Retake
            </button>
            <button
              onClick={analyse}
              style={{
                flex: 2,
                background: C.accent, border: 'none',
                color: '#fff', borderRadius: 14,
                padding: '14px', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Analyse
            </button>
          </div>
        </div>
      )}

      {/* Analysing step */}
      {step === 'analysing' && imageDataUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{
            position: 'relative',
            flex: 1,
            overflow: 'hidden',
            margin: '12px 20px 0',
            borderRadius: 16,
            background: '#000',
          }}>
            <img
              src={imageDataUrl}
              alt="Analysing"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.5 }}
            />
            {/* Spinner overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16,
            }}>
              <Spinner />
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                Analysing food…
              </span>
            </div>
          </div>
          <div style={{ height: 'calc(86px + env(safe-area-inset-bottom))' }} />
        </div>
      )}

      {/* Result step */}
      {step === 'result' && imageDataUrl && editResult && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Image thumbnail */}
          <div style={{
            height: 160,
            margin: '12px 20px 0',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#000',
            flexShrink: 0,
          }}>
            <img
              src={imageDataUrl}
              alt="Analysed"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
            {/* Confidence badge */}
            {result?.confidence && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: result.confidence === 'high' ? 'rgba(75,150,243,0.15)' : 'rgba(244,162,66,0.15)',
                border: `1px solid ${result.confidence === 'high' ? 'rgba(75,150,243,0.4)' : 'rgba(244,162,66,0.4)'}`,
                borderRadius: 99, padding: '4px 10px',
                fontSize: 11, fontWeight: 500,
                color: result.confidence === 'high' ? C.protein : C.carbs,
                marginBottom: 14,
              }}>
                <span style={{ fontSize: 8 }}>●</span>
                {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)} confidence
              </div>
            )}

            {/* Editable name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: C.secondary, display: 'block', marginBottom: 6, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Food Name
              </label>
              <input
                type="text"
                value={editResult.name}
                onChange={(e) => updateEdit('name', e.target.value)}
                style={{
                  width: '100%',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '11px 14px',
                  color: C.text,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Editable macros grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginBottom: 14,
            }}>
              {[
                { field: 'calories', label: 'Calories', unit: 'kcal', color: '#FFD166' },
                { field: 'protein', label: 'Protein', unit: 'g', color: C.protein },
                { field: 'carbs', label: 'Carbs', unit: 'g', color: C.carbs },
                { field: 'fat', label: 'Fat', unit: 'g', color: C.fat },
              ].map(({ field, label, unit, color }) => (
                <div key={field} style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '12px',
                }}>
                  <div style={{ fontSize: 11, color: C.secondary, marginBottom: 6, fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ color: C.muted }}>{unit}</span>
                  </div>
                  <input
                    type="number"
                    value={editResult[field]}
                    onChange={(e) => updateEdit(field, e.target.value)}
                    min="0"
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color,
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      padding: 0,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Meal selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: C.secondary, display: 'block', marginBottom: 8, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Meal
              </label>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {MEALS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMeal(m)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 99,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      background: meal === m ? C.accent : '#1A1A1A',
                      color: meal === m ? '#fff' : C.secondary,
                      fontFamily: 'inherit',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to log button */}
            <button
              onClick={handleAddToLog}
              style={{
                width: '100%',
                background: C.accent,
                border: 'none',
                borderRadius: 14,
                padding: '15px',
                color: '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '-0.01em',
                marginBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              Add to Log
            </button>

            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      )}
    </div>
  )
}
