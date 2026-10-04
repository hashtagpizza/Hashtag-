import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  QrCode,
  Sparkles,
  Check,
  Smartphone,
  Eye,
} from 'lucide-react';
import { HashtagLogo } from '../HashtagLogo';
import { CONTACT_INFO } from '../../constants';

interface TableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable?: (tableNum: number) => void;
}

export const TOTAL_TABLES = 8;

export const TableQrModal: React.FC<TableQrModalProps> = ({
  isOpen,
  onClose,
  onSelectTable,
}) => {
  const [selectedTable, setSelectedTable] = useState<number | 'all'>('all');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<number, string>>({});
  const [copiedTable, setCopiedTable] = useState<number | null>(null);

  // Generate QR Codes for Tables 1 through 8
  useEffect(() => {
    if (!isOpen) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hashtagpizza.np';

    const generateCodes = async () => {
      const urls: Record<number, string> = {};
      for (let i = 1; i <= TOTAL_TABLES; i++) {
        const targetUrl = `${origin}/?table=${i}`;
        try {
          const dataUrl = await QRCode.toDataURL(targetUrl, {
            width: 400,
            margin: 2,
            color: {
              dark: '#002B7F', // Brand Navy / Royal Blue
              light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
          });
          urls[i] = dataUrl;
        } catch (err) {
          console.error(`Failed to generate QR for Table ${i}:`, err);
        }
      }
      setQrCodeUrls(urls);
    };

    generateCodes();
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = (tableNum: number) => {
    const dataUrl = qrCodeUrls[tableNum];
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Hashtag_Pizza_Table_${tableNum}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = (tableNum: number) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hashtagpizza.np';
    const url = `${origin}/?table=${tableNum}`;
    navigator.clipboard.writeText(url);
    setCopiedTable(tableNum);
    setTimeout(() => setCopiedTable(null), 2000);
  };

  const tablesToRender =
    selectedTable === 'all'
      ? Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1)
      : [selectedTable];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header (Non-printable) */}
        <div className="print:hidden p-5 sm:p-6 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#164699] flex items-center justify-center text-white shadow-md">
              <QrCode className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  Table-Side QR Code Ordering
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                  8 Tables Ready
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Print acrylic stand cards for Tables 1 to 8. Customers scan with their phone camera to order directly to your kitchen!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-900 font-bold text-xs shadow transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Table Stands</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter / Table Selector Bar (Non-printable) */}
        <div className="print:hidden px-6 py-3.5 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="font-bold text-stone-700 mr-1 shrink-0">View:</span>
            <button
              onClick={() => setSelectedTable('all')}
              type="button"
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                selectedTable === 'all'
                  ? 'bg-[#164699] text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-300'
              }`}
            >
              All 8 Tables
            </button>
            {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setSelectedTable(num)}
                type="button"
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                  selectedTable === num
                    ? 'bg-[#164699] text-white shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-300'
                }`}
              >
                Table {num}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-stone-500 font-medium">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-300 text-stone-700 font-mono">Ctrl+P</kbd> or click Print to print acrylic table stands.
          </div>
        </div>

        {/* Table Stand Cards Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-8">
            {tablesToRender.map((tableNum) => {
              const qrUrl = qrCodeUrls[tableNum];
              const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hashtagpizza.np';
              const tableLink = `${origin}/?table=${tableNum}`;

              return (
                <div
                  key={tableNum}
                  className="bg-white rounded-3xl p-5 border-2 border-stone-200 shadow-md hover:shadow-xl transition-all flex flex-col items-center text-center relative overflow-hidden print:border-stone-800 print:shadow-none print:break-inside-avoid print:page-break-inside-avoid"
                >
                  {/* Decorative Brand Header Band */}
                  <div className="w-full bg-[#164699] text-white py-2 px-3 rounded-2xl mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                      Hashtag Pizza
                    </span>
                    <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                      Dine-In
                    </span>
                  </div>

                  {/* Logo */}
                  <div className="mb-2">
                    <HashtagLogo size="sm" variant="plain" />
                  </div>

                  {/* Table Badge */}
                  <div className="mb-3">
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-extrabold text-sm tracking-wide">
                        TABLE #{tableNum}
                      </span>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="relative p-3 bg-white rounded-2xl border-2 border-dashed border-[#164699]/30 shadow-inner mb-3">
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt={`QR Code for Table ${tableNum}`}
                        className="w-44 h-44 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-stone-400 text-xs">
                        Generating QR...
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <h4 className="text-sm font-black text-stone-900 leading-snug">
                    Scan with Phone Camera
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-1 max-w-[200px] leading-tight">
                    Browse menu, customize pizza & order directly to your table!
                  </p>

                  <div className="mt-3 pt-3 border-t border-stone-100 w-full text-[10px] text-stone-400">
                    <span>RB Complex, Adarshnagar, Birgunj</span>
                  </div>

                  {/* Action Buttons (Non-printable) */}
                  <div className="print:hidden w-full grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-stone-200 text-xs">
                    <button
                      onClick={() => handleCopyLink(tableNum)}
                      type="button"
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                      title="Copy Table URL"
                    >
                      {copiedTable === tableNum ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 mb-0.5" />
                          <span className="text-[10px] font-bold text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3.5 h-3.5 mb-0.5" />
                          <span className="text-[10px]">Copy Link</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDownloadQr(tableNum)}
                      type="button"
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                      title="Download High-Res PNG QR"
                    >
                      <Download className="w-3.5 h-3.5 mb-0.5" />
                      <span className="text-[10px]">Save PNG</span>
                    </button>

                    <a
                      href={tableLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#164699] text-white hover:bg-[#12397c] transition-colors cursor-pointer"
                      title="Preview table experience"
                    >
                      <Eye className="w-3.5 h-3.5 mb-0.5 text-amber-300" />
                      <span className="text-[10px] font-bold">Preview</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer (Non-printable) */}
        <div className="print:hidden p-4 bg-stone-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-stone-800">
          <div className="flex items-center gap-2 text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Direct Table Dine-In is active across all 8 tables at RB Complex, Birgunj.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-stone-900 font-bold hover:bg-amber-300 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print All 8 Stands</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
