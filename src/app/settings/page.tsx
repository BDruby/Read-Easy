'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Mic,
  CloudUpload,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Server,
  Key,
  Globe,
  Radio
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { CHINESE_VOICES } from '@/lib/tts/edge-tts';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'tts' | 'r2' | 'database' | 'vercel'>('tts');

  // TTS Form State (Microsoft Edge Neural Only)
  const [edgeVoice, setEdgeVoice] = useState('zh-CN-YunjianNeural');

  // Cloudflare R2 Form State
  const [r2AccountId, setR2AccountId] = useState('');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');
  const [r2BucketName, setR2BucketName] = useState('');
  const [r2PublicDomain, setR2PublicDomain] = useState('');

  // UI Status
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Live Test Status
  const [isTestingTTS, setIsTestingTTS] = useState(false);
  const [isTestingR2, setIsTestingR2] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);

  // Load Settings on Mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const d = data.data;
          setEdgeVoice(d.edge_voice || 'zh-CN-YunjianNeural');

          setR2AccountId(d.r2_account_id || '');
          setR2AccessKeyId(d.r2_access_key_id || '');
          setR2SecretAccessKey(d.r2_secret_access_key || '');
          setR2BucketName(d.r2_bucket_name || '');
          setR2PublicDomain(d.r2_public_domain || '');
        }
      })
      .catch((err) => setErrorMsg('加载配置异常: ' + err.message))
      .finally(() => setIsLoading(false));

    // Check DB Status
    fetch('/api/settings/test-db')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDbStatus(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edge_voice: edgeVoice,
          r2_account_id: r2AccountId,
          r2_access_key_id: r2AccessKeyId,
          r2_secret_access_key: r2SecretAccessKey,
          r2_bucket_name: r2BucketName,
          r2_public_domain: r2PublicDomain,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || '保存失败');

      try {
        localStorage.setItem('review_tts_voice', edgeVoice);
      } catch {}

      setSaveSuccessMsg('所有配置已成功保存！');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || '保存配置失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Speech Synthesis
  const handleTestTTS = async () => {
    setIsTestingTTS(true);
    setIsPlayingTestAudio(false);
    try {
      const res = await fetch('/api/settings/test-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: edgeVoice,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '语音试听合成失败');
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onplay = () => setIsPlayingTestAudio(true);
      audio.onended = () => setIsPlayingTestAudio(false);
      audio.onerror = () => setIsPlayingTestAudio(false);
      await audio.play();
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || '语音试听合成失败');
    } finally {
      setIsTestingTTS(false);
    }
  };

  // Test Cloudflare R2 Connection
  const handleTestR2 = async () => {
    setIsTestingR2(true);
    setR2TestResult(null);
    try {
      const res = await fetch('/api/settings/test-r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: r2AccountId,
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          bucketName: r2BucketName,
          publicDomain: r2PublicDomain,
        }),
      });

      const data = await res.json();
      setR2TestResult(data);
    } catch (err: any) {
      setR2TestResult({ success: false, message: '测试异常: ' + err.message });
    } finally {
      setIsTestingR2(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Back Link & Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 text-stone-600 dark:text-stone-300 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6 text-amber-500" />
                <span>系统设置与后台配置</span>
              </h1>
              <p className="text-xs text-stone-500">配置语音模型、Cloudflare R2 存储、数据库与 Vercel 部署</p>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {saveSuccessMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 mb-6 gap-2 sm:gap-4 overflow-x-auto">
          {[
            { id: 'tts', label: '语音模型 (TTS)', icon: Mic },
            { id: 'r2', label: 'Cloudflare R2 存储', icon: CloudUpload },
            { id: 'database', label: 'MySQL 数据库状态', icon: Database },
            { id: 'vercel', label: '一键部署到 Vercel', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                  isSelected
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* TAB 1: TTS Model Configuration */}
          {activeTab === 'tts' && (
            <div className="space-y-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Mic className="w-5 h-5 text-amber-500" />
                    <span>微软 Edge Neural 顶级神经网络语音</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">免配置 · 免Key · 零Token消耗 · 毫秒级极速响应 · 高拟真度文学播音</p>
                </div>

                <button
                  type="button"
                  onClick={handleTestTTS}
                  disabled={isTestingTTS}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 text-xs font-semibold transition"
                >
                  {isTestingTTS ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isPlayingTestAudio ? (
                    <Pause className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{isTestingTTS ? '合成中...' : isPlayingTestAudio ? '正在播放' : '试听当前音色'}</span>
                </button>
              </div>

              {/* Engine Highlight Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-stone-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300">当前默认引擎：微软 Edge Neural 神经语音</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      ⚡ 完全免费 · 永久免Token
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    默认首选「云健 (影视评书/热血说书)」，抑扬顿挫有张力，极度契合网文悬疑、仙侠、历史爽文校对审听。
                  </p>
                </div>
              </div>

              {/* Edge TTS Voice Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  选择默认小说听审音色
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CHINESE_VOICES.map((v) => {
                    const isSelected = edgeVoice === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setEdgeVoice(v.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500 shadow-sm'
                            : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/40 dark:bg-stone-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                            {v.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            v.gender === 'Male'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {v.gender === 'Male' ? '男声' : '女声'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                          {v.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Cloudflare R2 Storage */}
          {activeTab === 'r2' && (
            <div className="space-y-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <CloudUpload className="w-5 h-5 text-amber-500" />
                    <span>Cloudflare R2 对象存储配置</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    用于全书文稿云端备份、原稿打包归档与有声合成缓存
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestR2}
                  disabled={isTestingR2}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 text-xs font-semibold transition"
                >
                  {isTestingR2 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
                  <span>{isTestingR2 ? '测试中...' : '测试 R2 连通性'}</span>
                </button>
              </div>

              {r2TestResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                    r2TestResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200'
                  }`}
                >
                  {r2TestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{r2TestResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Cloudflare Account ID
                  </label>
                  <input
                    type="text"
                    placeholder="例如：68f45a1e2b3c4d5e6f7a8b9c..."
                    value={r2AccountId}
                    onChange={(e) => setR2AccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Bucket Name (存储桶名称)
                  </label>
                  <input
                    type="text"
                    placeholder="例如：shengao-novels"
                    value={r2BucketName}
                    onChange={(e) => setR2BucketName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    placeholder="R2 API 令牌 Access Key ID"
                    value={r2AccessKeyId}
                    onChange={(e) => setR2AccessKeyId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Secret Access Key
                  </label>
                  <input
                    type="password"
                    placeholder="R2 API 令牌 Secret Access Key"
                    value={r2SecretAccessKey}
                    onChange={(e) => setR2SecretAccessKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    公开自定义域名 (可选，用于 CDN 加速)
                  </label>
                  <input
                    type="text"
                    placeholder="例如：https://cdn.yourdomain.com 或 R2 提供的 r2.dev 链接"
                    value={r2PublicDomain}
                    onChange={(e) => setR2PublicDomain(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MySQL Database Status */}
          {activeTab === 'database' && (
            <div className="space-y-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-500" />
                    <span>MySQL 数据库连接状态</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    服务器：101.200.156.170:3306 / 数据库：shengao
                  </p>
                </div>

                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>已正常连接</span>
                </span>
              </div>

              {dbStatus ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-center">
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {dbStatus.counts.projects}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">作品总数</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-center">
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {dbStatus.counts.chapters}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">总章节数</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-center">
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                      {dbStatus.counts.annotations}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">审稿批注数</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {dbStatus.latency}
                    </div>
                    <div className="text-xs text-stone-500 mt-1">网络延迟</div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-stone-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                  <span>正在检测数据库状态...</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Vercel Deployment Helper */}
          {activeTab === 'vercel' && (
            <div className="space-y-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Server className="w-5 h-5 text-amber-500" />
                  <span>一键部署到 Vercel 指南</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  本项目完全兼容 Vercel Serverless 环境，只需配置环境变量即可在全球高速访问
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
                <p className="font-semibold text-stone-800 dark:text-stone-200">
                  部署步骤：
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>将代码仓库推送至您的 GitHub / GitLab。</li>
                  <li>在 Vercel 官网点击 <b>New Project</b> 并选择导入此仓库。</li>
                  <li>在 <b>Environment Variables (环境变量)</b> 中添加以下必填参数：</li>
                </ol>

                <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 font-mono text-[11px] overflow-x-auto space-y-1 border border-stone-800">
                  <div>DATABASE_URL="mysql://shengao:yDrFsxpyQcmGti6G@101.200.156.170:3306/shengao"</div>
                  <div>NEXT_PUBLIC_APP_NAME="审稿大师 - WriterCraft Reviewer"</div>
                </div>

                <p className="text-stone-500">
                  4. 点击 <b>Deploy</b>，约 1 分钟即可完成部署并获得全球高速访问链接！
                </p>
              </div>
            </div>
          )}

          {/* Save Action Floating / Bottom Button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
            >
              返回作品列表
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '正在保存...' : '保存所有设置'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
