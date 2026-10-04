import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, QrCode, ScanLine, Copy, Check } from 'lucide-react';

/**
 * Member QR — share handle for peer transfers / locate member for transactions.
 * Uses a member payment URI; camera scan is best-effort via BarcodeDetector when available.
 */
export default function MemberQR() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [scanNote, setScanNote] = useState('');
  const [peerId, setPeerId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const payload = useMemo(() => {
    if (!user) return '';
    const handle = user.id || user.email || '';
    return `vantoris://pay?member=${encodeURIComponent(handle)}&v=1`;
  }, [user]);

  const qrImg = payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`
    : '';

  async function copyLink() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  }

  function goPayPeer() {
    if (!peerId.trim()) return;
    navigate(`/move-money?action=send&to=${encodeURIComponent(peerId.trim())}`);
  }

  async function tryScan() {
    setScanNote('');
    if (!('BarcodeDetector' in window)) {
      setScanNote('Camera scan not supported on this device—paste a member ID below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const timer = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            clearInterval(timer);
            stream.getTracks().forEach((t) => t.stop());
            const raw = codes[0].rawValue;
            const m = raw.match(/member=([^&]+)/);
            const id = m ? decodeURIComponent(m[1]) : raw;
            setPeerId(id);
            setScanNote('Member located. Confirm to continue to Move Money.');
          }
        } catch (_) {}
      }, 500);
      setTimeout(() => {
        clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
      }, 15000);
      setScanNote('Scanning… point camera at member QR (15s).');
    } catch (e) {
      setScanNote(e.message || 'Camera permission denied.');
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24">
      <div className="sticky top-0 z-10 bg-white/95 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-1.5 rounded-lg hover:bg-slate-100"><ArrowLeft size={20} /></Link>
        <h1 className="font-heading font-bold text-navy">Member QR</h1>
      </div>

      <div className="p-5 max-w-md mx-auto space-y-6">
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <p className="text-xs font-mono uppercase tracking-wider text-brass">Your receive code</p>
          <p className="text-sm text-slate-500 mt-1">Let another member scan to pay you</p>
          <div className="mt-4 mx-auto w-[220px] h-[220px] bg-white rounded-xl border border-slate-100 flex items-center justify-center">
            {qrImg ? (
              <img src={qrImg} alt="Member payment QR" width={220} height={220} className="rounded-lg" />
            ) : (
              <QrCode size={64} className="text-slate-300" />
            )}
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy text-white px-4 py-2 text-sm font-semibold"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy pay link'}
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
          <p className="font-heading font-bold text-navy flex items-center gap-2">
            <ScanLine size={18} className="text-brass" /> Locate member
          </p>
          <button
            type="button"
            onClick={tryScan}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-navy hover:bg-slate-50"
          >
            Scan member QR
          </button>
          <input
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
            placeholder="Member ID or email"
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
          />
          <button
            type="button"
            onClick={goPayPeer}
            disabled={!peerId.trim()}
            className="w-full rounded-full bg-navy text-white py-3 text-sm font-bold disabled:opacity-40"
          >
            Continue to transfer
          </button>
          {scanNote && <p className="text-xs text-slate-500">{scanNote}</p>}
        </div>
      </div>
    </div>
  );
}
