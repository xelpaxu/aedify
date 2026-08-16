'use client'

import { useState } from "react"
import { Save, AlertCircle, Wifi, Map as MapIcon, RefreshCw, SlidersHorizontal, Globe } from "lucide-react"
import { useLanguage, Language } from '../../../src/lib/translations'

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage()
  const [w1, setW1] = useState(0.4)
  const [w2, setW2] = useState(0.8)
  const [w3, setW3] = useState(0.6)
  const [weatherApi, setWeatherApi] = useState(true)
  const [gisApi, setGisApi] = useState(true)

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in-up max-w-5xl mx-auto w-full pb-8">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-0.5">{t('systemTuning')}</h1>
           <p className="text-sm text-slate-500">{t('adjustParams')}</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all font-semibold active:scale-[0.98] text-sm">
           <Save size={16} /> {t('saveConfig')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 mb-4">
             <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                <Wifi size={16} />
             </div>
             <h3 className="text-base font-bold text-slate-800">{t('coreConfig')}</h3>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 space-y-0 divide-y divide-slate-100">
            {/* Weather API */}
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Wifi size={16} />
                 </div>
                 <div>
                   <p className="font-semibold text-slate-800 text-sm">{t('weatherApi')}</p>
                   <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{t('weatherStation')}</p>
                 </div>
              </div>
              <button 
                 onClick={() => setWeatherApi(!weatherApi)}
                 className={`w-11 h-6 rounded-full relative transition-colors duration-300 shadow-inner ${weatherApi ? 'bg-slate-900' : 'bg-slate-300'}`}
              >
                 <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-300 ${weatherApi ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* City GIS */}
            <div className="flex items-center justify-between py-4">
              <div className="flex gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <MapIcon size={16} />
                 </div>
                 <div>
                   <p className="font-semibold text-slate-800 text-sm">{t('cityGIS')}</p>
                   <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{t('terrainData')}</p>
                 </div>
              </div>
              <button 
                 onClick={() => setGisApi(!gisApi)}
                 className={`w-11 h-6 rounded-full relative transition-colors duration-300 shadow-inner ${gisApi ? 'bg-slate-900' : 'bg-slate-300'}`}
              >
                 <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform duration-300 ${gisApi ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Refresh Rate */}
            <div className="py-4 last:pb-0">
               <div className="flex items-center gap-2 mb-2.5">
                  <RefreshCw size={14} className="text-slate-400" />
                  <p className="font-semibold text-slate-800 text-sm">{t('refreshRate')}</p>
               </div>
               <select className="w-full bg-white text-sm font-medium text-slate-700 px-3.5 py-2.5 border border-slate-200/60 rounded-xl outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 cursor-pointer transition appearance-none">
                  <option value="5">{t('every5min')}</option>
                  <option value="15">{t('every15min')}</option>
                  <option value="60">{t('everyHour')}</option>
               </select>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                   <SlidersHorizontal size={16} />
                </div>
                <h3 className="text-base font-bold text-slate-800">{t('abmConstants')}</h3>
             </div>
             <span className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                {t('liveRecalc')}
             </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 space-y-5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
               <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
               <p className="text-xs font-medium text-slate-600 leading-relaxed">
                 {t('weightWarning')}
               </p>
            </div>

            {/* Weight sliders */}
            <div className="space-y-5">
              {[
                { label: t('weatherWeight'), value: w1, set: setW1 },
                { label: t('detectionWeight'), value: w2, set: setW2 },
                { label: t('spreadWeight'), value: w3, set: setW3 },
              ].map(({ label, value, set }) => (
                <div key={label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-slate-700 font-semibold text-sm">{label}</label>
                    <div className="px-2.5 py-1 bg-slate-50 font-mono text-xs font-semibold text-slate-600 border border-slate-200/60 rounded-lg min-w-[50px] text-center">
                       {value.toFixed(2)}
                    </div>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05" value={value} onChange={(e) => set(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Language Settings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60">
            <div className="flex items-center gap-2.5 mb-4">
               <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                  <Globe size={16} />
               </div>
               <h3 className="text-base font-bold text-slate-800">{t('language')}</h3>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border ${
                  language === 'en'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                }`}
              >
                {t('english')}
              </button>
              <button
                onClick={() => setLanguage('tl')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border ${
                  language === 'tl'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50'
                }`}
              >
                {t('tagalog')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
