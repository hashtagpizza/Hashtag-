import React from 'react';
import { Utensils, X, QrCode } from 'lucide-react';

interface TableBannerProps {
  tableNumber: number;
  onChangeTable: () => void;
  onClearTable: () => void;
  onOpenQrManager: () => void;
}

export const TableBanner: React.FC<TableBannerProps> = ({
  tableNumber,
  onChangeTable,
  onClearTable,
  onOpenQrManager,
}) => {
  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 px-4 py-2 shadow-sm border-b border-amber-600/20 sticky top-20 z-30 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center font-black shrink-0 shadow-xs">
            <Utensils className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-extrabold uppercase tracking-wide bg-stone-900 text-white px-2 py-0.5 rounded text-[11px] mr-2">
              Table #{tableNumber} Active
            </span>
            <span className="font-medium text-stone-900 hidden sm:inline">
              Dine-In Mode: Your order goes straight to the kitchen pipeline and will be served directly to your table!
            </span>
            <span className="font-medium text-stone-900 sm:hidden">
              Dine-In at Table #{tableNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onChangeTable}
            type="button"
            className="px-2.5 py-1 rounded-md bg-stone-900 text-white font-bold text-[11px] hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Switch Table
          </button>
          <button
            onClick={onOpenQrManager}
            type="button"
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/80 hover:bg-white text-stone-900 font-bold text-[11px] transition-colors cursor-pointer"
            title="View All 10 Table Stands"
          >
            <QrCode className="w-3 h-3 text-[#164699]" />
            <span>QR Stands</span>
          </button>
          <button
            onClick={onClearTable}
            type="button"
            className="p-1 rounded-md text-stone-800 hover:text-stone-950 hover:bg-amber-600/20 transition-colors"
            title="Exit Dine-In Table Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
