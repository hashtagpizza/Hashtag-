import React, { useState } from 'react';
import {
  ChefHat,
  Printer,
  Clock,
  CheckCircle2,
  Flame,
  Utensils,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  Volume2,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types/crm';
import { crmService } from '../../services/crmService';

interface KotDisplayProps {
  orders: Order[];
}

export const KotDisplay: React.FC<KotDisplayProps> = ({ orders }) => {
  const [activeFilter, setActiveFilter] = useState<'active' | 'kitchen' | 'ready' | 'all'>('active');
  const [selectedKotToPrint, setSelectedKotToPrint] = useState<Order | null>(null);

  // Filter KOT tickets
  const kotTickets = orders.filter((o) => {
    if (activeFilter === 'active') return o.status === 'new' || o.status === 'kitchen';
    if (activeFilter === 'kitchen') return o.status === 'kitchen';
    if (activeFilter === 'ready') return o.status === 'ready';
    return true;
  });

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    await crmService.updateOrderStatus(orderId, nextStatus);
  };

  // Helper to calculate minutes elapsed
  const getMinutesAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diffMs / 60000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 p-4 sm:p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white">Live Kitchen Order Tickets (KOT)</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
              {kotTickets.length} Tickets
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time kitchen order queue for conveyor ovens, prep stations & kitchen ticket printing.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl text-xs font-bold border border-slate-800">
          {(['active', 'kitchen', 'ready', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                activeFilter === tab
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'active' ? '🔥 Active Prep' : tab === 'kitchen' ? '🍕 In Oven' : tab === 'ready' ? '✅ Ready' : '📋 All Orders'}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {kotTickets.length === 0 ? (
          <div className="col-span-full h-80 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ChefHat className="w-12 h-12 mb-3 stroke-1 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-400">All Kitchen Tickets Cleared</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              No orders are currently waiting for preparation. New orders from website and POS terminal will appear here instantly.
            </p>
          </div>
        ) : (
          kotTickets.map((ticket) => {
            const minutesElapsed = getMinutesAgo(ticket.createdAt);
            const isUrgent = minutesElapsed > 15;
            const isMedium = minutesElapsed > 8;

            return (
              <div
                key={ticket.id}
                className={`flex flex-col justify-between rounded-2xl bg-slate-900 border transition-all shadow-md overflow-hidden ${
                  ticket.status === 'new'
                    ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                    : ticket.status === 'kitchen'
                    ? 'border-blue-500/60'
                    : 'border-emerald-500/60'
                }`}
              >
                {/* Ticket Top Header */}
                <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-white">
                      #{ticket.id.slice(-6)}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        ticket.orderType === 'dine-in'
                          ? 'bg-amber-400 text-slate-950'
                          : ticket.orderType === 'delivery'
                          ? 'bg-blue-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {ticket.orderType === 'dine-in' && ticket.tableNumber
                        ? `Table #${ticket.tableNumber}`
                        : ticket.orderType}
                    </span>
                  </div>

                  {/* Elapsed Timer Badge */}
                  <div
                    className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                      isUrgent
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : isMedium
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{minutesElapsed}m ago</span>
                  </div>
                </div>

                {/* Items & Instructions Body */}
                <div className="p-4 flex-1 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Fulfillment Items:
                    </span>
                    <div className="mt-1.5 space-y-1.5">
                      {ticket.itemsSummary.split(', ').map((itemLine, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-semibold text-slate-200"
                        >
                          <span className="w-4 h-4 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                            •
                          </span>
                          <span className="leading-snug">{itemLine}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {ticket.notes && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                      <span className="font-bold block text-[10px] uppercase text-amber-400">
                        Kitchen Instruction:
                      </span>
                      {ticket.notes}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Customer: {ticket.customerName}</span>
                    <span className="font-mono">Total: Rs. {ticket.total}</span>
                  </div>
                </div>

                {/* Ticket Action Footer */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedKotToPrint(ticket)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Print Thermal KOT Ticket"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                  </button>

                  {ticket.status === 'new' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'kitchen')}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Send to Oven</span>
                    </button>
                  )}

                  {ticket.status === 'kitchen' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'ready')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready</span>
                    </button>
                  )}

                  {ticket.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'delivered')}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Complete & Dispatch</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Printable Thermal KOT Ticket Modal */}
      {selectedKotToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white text-slate-950 rounded-2xl p-5 shadow-2xl font-mono">
            <div id="kot-thermal-print" className="border-b-2 border-dashed border-slate-300 pb-3 text-center">
              <h2 className="font-black text-xl text-slate-950 tracking-wider">KITCHEN ORDER TICKET</h2>
              <p className="text-xs font-bold text-slate-700">HASHTAG PIZZA BIRGUNJ</p>

              <div className="my-2 border-t border-b border-slate-200 py-1.5 text-xs text-left">
                <div className="flex justify-between font-black text-sm">
                  <span>KOT #{selectedKotToPrint.id.slice(-6)}</span>
                  <span>
                    {selectedKotToPrint.orderType === 'dine-in'
                      ? `TABLE ${selectedKotToPrint.tableNumber || 1}`
                      : selectedKotToPrint.orderType.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Time: {new Date(selectedKotToPrint.createdAt).toLocaleTimeString()}
                </div>
                <div className="text-[11px] text-slate-600">
                  Guest: {selectedKotToPrint.customerName}
                </div>
              </div>

              {/* Items List */}
              <div className="text-left text-xs my-3 space-y-1.5 font-bold">
                {selectedKotToPrint.itemsSummary.split(', ').map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b border-slate-100 pb-1">
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {selectedKotToPrint.notes && (
                <div className="my-2 p-1.5 bg-slate-100 border border-slate-300 text-left text-xs">
                  <span className="font-black block text-[10px]">CHEF NOTE:</span>
                  {selectedKotToPrint.notes}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print KOT Receipt</span>
              </button>
              <button
                onClick={() => setSelectedKotToPrint(null)}
                className="py-2 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
