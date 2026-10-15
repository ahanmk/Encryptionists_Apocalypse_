import React, { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { exportState } from '../utils/sync'

export default function SyncPanel() {
  const store = useGameStore()
  const syncState = useGameStore((state) => state.syncState)

  const [generatedCode, setGeneratedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Generate Base64 synchronization token
  const handleGenerate = () => {
    const code = exportState(store)
    setGeneratedCode(code)
    setCopied(false)
    setErrorMessage(null)
  }

  // Copy token to clipboard
  const handleCopy = async () => {
    if (!generatedCode) return
    try {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      // Fallback for browsers with restricted clipboard permission
      const textarea = document.createElement('textarea')
      textarea.value = generatedCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Apply imported partner token
  const handleApply = () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!inputCode.trim()) {
      setErrorMessage('Please enter a state code to synchronize.')
      return
    }

    const success = syncState(inputCode)
    if (success) {
      setSuccessMessage('✓ State successfully applied! Party position, routes, and inventories updated.')
      setInputCode('')
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setErrorMessage('Invalid or corrupted state code. Verify the string was copied completely.')
    }
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header Info */}
      <div className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-1">
        <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>P2P Field Radio Synchronization</span>
        </div>
        <p className="text-[11px] text-wasteland-400 font-sans leading-relaxed">
          Synchronize expedition progression between Aarav and Mira without an internet connection or backend server.
        </p>
      </div>

      {/* GENERATE SECTION */}
      <div className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-wasteland-300 uppercase tracking-wider text-[11px]">
            1. Transmit Your State
          </span>
          <span className="text-[10px] text-wasteland-500">Base64 Encoded</span>
        </div>

        <button
          onClick={handleGenerate}
          className="w-full py-2 px-3 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 font-bold tracking-wider uppercase transition-colors shadow flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>⚡ Generate State Code</span>
        </button>

        {generatedCode && (
          <div className="space-y-2 pt-1">
            <div className="relative">
              <textarea
                readOnly
                value={generatedCode}
                rows={3}
                className="w-full p-2 bg-[#08090a] border border-wasteland-700 rounded text-[10px] text-emerald-400 select-all font-mono break-all focus:outline-none"
              />
            </div>
            <button
              onClick={handleCopy}
              className={`w-full py-1.5 px-3 rounded font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-wasteland-800 hover:bg-wasteland-700 text-wasteland-200 border border-wasteland-700'
              }`}
            >
              <span>{copied ? '✓ Copied to Clipboard!' : '📋 Copy Code'}</span>
            </button>
          </div>
        )}
      </div>

      {/* IMPORT SECTION */}
      <div className="p-3 rounded-lg bg-wasteland-850 border border-wasteland-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-wasteland-300 uppercase tracking-wider text-[11px]">
            2. Receive Partner's State
          </span>
          <span className="text-[10px] text-wasteland-500">Paste Code</span>
        </div>

        <textarea
          value={inputCode}
          onChange={(e) => {
            setInputCode(e.target.value)
            setErrorMessage(null)
          }}
          placeholder="Paste Base64 sync code from partner here..."
          rows={3}
          className="w-full p-2 bg-[#08090a] border border-wasteland-700 rounded text-[10px] text-wasteland-200 font-mono break-all focus:border-cyan-500 focus:outline-none placeholder:text-wasteland-600"
        />

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-2 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] leading-relaxed">
            ⚠ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-2 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] leading-relaxed">
            {successMessage}
          </div>
        )}

        <button
          onClick={handleApply}
          className="w-full py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-wider uppercase transition-colors shadow flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>📥 Apply Partner's Code</span>
        </button>
      </div>

      {/* Mandatory Offline Sharing Note */}
      <div className="p-3 rounded bg-wasteland-900 border border-wasteland-800/80 text-[11px] text-wasteland-400 font-sans leading-relaxed text-center">
        💡 <b className="text-wasteland-300 font-mono">Note:</b> Share this code by text, Bluetooth, or by reading it aloud. No internet needed.
      </div>
    </div>
  )
}
