import React, { useEffect, useState } from 'react';
import {
  loadConfig,
  saveConfig,
  resetConfig,
} from '../../config/local-config';
import type { AppConfig } from '../../config/local-config';

const RATE_OPTIONS = [0.8, 1.0, 1.2];
const VOLUME_OPTIONS = [0.5, 0.75, 1.0];

export default function SettingsPage() {
  const [cfg, setCfg] = useState<AppConfig>(loadConfig());
  const [savedMsg, setSavedMsg] = useState<string>('');

  useEffect(() => {
    setCfg(loadConfig());
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updated = saveConfig(cfg);
    setCfg(updated);
    setSavedMsg('已儲存設定');
    setTimeout(() => setSavedMsg(''), 2000);
  }

  function handleReset() {
    const updated = resetConfig();
    setCfg(updated);
    setSavedMsg('已重設為預設值');
    setTimeout(() => setSavedMsg(''), 2000);
  }

  return (
    <div className="min-h-screen">
      <div className="notion-page">
        <h1 className="mb-2">設定</h1>
        <p className="notion-muted mb-4">管理語音服務與模型金鑰等設定。</p>
        <form onSubmit={handleSave} className="space-y-4">
          <section className="notion-card p-3 md:p-4">
            <h2 className="font-medium mb-2">Azure Speech</h2>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm text-gray-600">Region</span>
                <input
                  type="text"
                  value={cfg.azure.region}
                  onChange={(e) => setCfg({ ...cfg, azure: { ...cfg.azure, region: e.target.value } })}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="eastasia"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">Key</span>
                <input
                  type="password"
                  value={cfg.azure.key ?? ''}
                  onChange={(e) => setCfg({ ...cfg, azure: { ...cfg.azure, key: e.target.value } })}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="Azure Speech Subscription Key"
                />
              </label>
            </div>
          </section>

          <section className="notion-card p-3 md:p-4">
            <h2 className="font-medium mb-2">文字轉語音（TTS）</h2>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm text-gray-600">Voice Name</span>
                <input
                  type="text"
                  value={cfg.tts.ttsVoice}
                  onChange={(e) => setCfg({ ...cfg, tts: { ...cfg.tts, ttsVoice: e.target.value } })}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="zh-HK-HiuMaanNeural"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-gray-600">Rate</span>
                  <select
                    value={cfg.tts.ttsRate}
                    onChange={(e) => setCfg({ ...cfg, tts: { ...cfg.tts, ttsRate: parseFloat(e.target.value) } })}
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    {RATE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600">Volume</span>
                  <select
                    value={cfg.tts.ttsVolume}
                    onChange={(e) => setCfg({ ...cfg, tts: { ...cfg.tts, ttsVolume: parseFloat(e.target.value) } })}
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    {VOLUME_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="notion-card p-3 md:p-4">
            <h2 className="font-medium mb-2">DeepSeek</h2>
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm text-gray-600">API Key</span>
                <input
                  type="password"
                  value={cfg.deepseek.apiKey ?? ''}
                  onChange={(e) => setCfg({ ...cfg, deepseek: { apiKey: e.target.value } })}
                  className="mt-1 w-full border rounded px-3 py-2"
                  placeholder="DeepSeek API Key"
                />
              </label>
            </div>
          </section>

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 rounded">
              儲存
            </button>
            <button type="button" onClick={handleReset} className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 rounded">
              重設
            </button>
            {savedMsg && <span className="text-sm notion-muted">{savedMsg}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}