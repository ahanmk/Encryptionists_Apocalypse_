import React from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { useGameStore } from './store/useGameStore'

/**
 * The Last Beacon - Main Application Shell
 * Built for offline survival navigation through a quarantined city.
 */
export default function App() {
  const gameStatus = useGameStore((state) => state.gameStatus)
  const activeThreats = useGameStore((state) => state.activeThreats) || []
  const hasHorde = activeThreats.some((t) => t.eventId === 'horde_spotted')

  return (
    <div className="flex flex-col h-screen w-screen bg-wasteland-950 text-wasteland-200 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex-none border-b border-wasteland-800 bg-wasteland-900/95 backdrop-blur px-4 py-2.5 sm:py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-beacon-dim/30 border border-beacon-amber/60 flex items-center justify-center text-beacon-amber flex-shrink-0">
            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-black tracking-widest text-wasteland-100 font-mono uppercase flex items-center gap-2">
              THE LAST BEACON
              <span className="hidden sm:inline-block text-[10px] font-normal px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 tracking-normal">
                OFFLINE ACTIVE
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-amber-500 font-mono tracking-wider">
              Day 19. No signal. One chance.
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
          {gameStatus === 'lost' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950 border border-rose-500 text-rose-300 font-bold animate-pulse text-[11px]">
              <span>☠</span>
              <span>FAILED TO REACH BEACON</span>
            </div>
          )}
          {hasHorde && gameStatus !== 'lost' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950 border border-rose-500 text-rose-300 font-bold animate-pulse text-[11px]">
              <span>🧟</span>
              <span>SUDDEN ZOMBIE HORDE</span>
            </div>
          )}
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[10px] text-wasteland-400">OBJECTIVE</span>
            <span className="text-sky-400 font-bold">REACH THE BEACON SANCTUARY</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-wasteland-850 border border-wasteland-700">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-wasteland-300 text-[11px]">COMMS DOWN</span>
          </div>
        </div>
      </header>

      {/* Main Container: Map on left, Sidebar on right (responsive layout) */}
      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden relative">
        {/* Left: Map Canvas */}
        <section className="flex-1 min-h-[460px] md:min-h-0 md:h-full relative overflow-hidden bg-wasteland-950 flex flex-col">
          <MapView />
        </section>

        {/* Right: Sidebar & Panels (stacks below map on mobile, scrollable on desktop) */}
        <section className="w-full md:w-84 lg:w-96 flex-none md:h-full flex flex-col overflow-hidden border-t md:border-t-0 md:border-l border-wasteland-800 bg-wasteland-900">
          <Sidebar />
        </section>
      </main>
    </div>
  )
}
