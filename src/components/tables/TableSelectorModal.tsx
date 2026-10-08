import React from 'react';
import { X, Utensils, Check, Sparkles } from 'lucide-react';
import { TOTAL_TABLES } from './TableQrModal';

interface TableSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTable: number | null;
  onSelectTable: (tableNum: number) => void;
}

export const TableSelectorModal: React.FC<TableSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTable,
  onSelectTable,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl text-stone-900 border border-stone-100">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Utensils className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 leading-tight">
              Select Your Table Number
            </h3>
            <p className="text-xs text-stone-500">
              Dine-In Sitting Area at RB Complex (Tables 1 – 10)
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-600 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-200/70">
          Choose the table number displayed on the acrylic QR stand on your table. Your orders will be brought straight to you!
        </p>

        <div className="grid grid-cols-5 gap-2 mb-5">
          {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map((num) => {
            const isSelected = currentTable === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  onSelectTable(num);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#164699] bg-[#164699] text-white shadow-md scale-105'
                    : 'border-stone-200 bg-stone-50 text-stone-800 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                  Table
                </span>
                <span className="text-xl font-black mt-0.5">
                  {num}
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 mt-1 text-amber-300" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Air-Conditioned Dine-In
          </span>
          <button
            onClick={() => {
              onSelectTable(0); // Clear table
              onClose();
            }}
            type="button"
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline"
          >
            Clear / Unset Table
          </button>
        </div>
      </div>
    </div>
  );
};
