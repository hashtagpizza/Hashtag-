import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Bookmark,
  Plus,
  Trash2,
  Check,
  Compass,
  Car,
  AlertCircle,
  Clock,
  Coins,
  ShieldCheck,
  LocateFixed,
} from 'lucide-react';
import {
  STORE_COORDINATES,
  BIRGUNJ_LANDMARKS,
  computeDeliveryRoute,
  DeliveryCalculationResult,
  BirgunjLandmark,
} from '../../services/deliveryService';
import { useAuth } from '../../context/AuthContext';
import { SavedAddress } from '../../types/auth';

interface DeliveryLocationPickerProps {
  onLocationSelected: (locationData: {
    address: string;
    landmark: string;
    lat: number;
    lng: number;
    distanceKm: number;
    deliveryFee: number;
    durationMinutes: number;
    tierDescription: string;
  }) => void;
  initialAddress?: string;
  currentFee?: number;
}

export const DeliveryLocationPicker: React.FC<DeliveryLocationPickerProps> = ({
  onLocationSelected,
  initialAddress = '',
}) => {
  const { user, saveDeliveryAddress, removeDeliveryAddress } = useAuth();

  // Pinned delivery coordinate (default to Adarshnagar near store)
  const [pinnedCoord, setPinnedCoord] = useState<{ lat: number; lng: number }>({
    lat: 27.0138,
    lng: 84.8772,
  });

  const [addressInput, setAddressInput] = useState(initialAddress);
  const [landmarkInput, setLandmarkInput] = useState('Adarshnagar (Near Ghantaghar / Link Road)');
  const [calculation, setCalculation] = useState<DeliveryCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Address Saving Modal / State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Home');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Guest saved addresses from localStorage if not signed in
  const [guestAddresses, setGuestAddresses] = useState<SavedAddress[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('hashtag_guest_saved_addresses');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const savedList = user?.savedAddresses && user.savedAddresses.length > 0
    ? user.savedAddresses
    : guestAddresses;

  // Map viewport bounds and drag simulation
  const [zoom, setZoom] = useState(15);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 27.015,
    lng: 84.878,
  });

  // Calculate route and delivery rates whenever pinnedCoord changes
  const runRouteCalculation = useCallback(
    async (coords: { lat: number; lng: number }, landmarkName?: string) => {
      setIsCalculating(true);
      try {
        const result = await computeDeliveryRoute(coords, STORE_COORDINATES);
        setCalculation(result);

        onLocationSelected({
          address: addressInput || landmarkName || 'Birgunj Delivery Spot',
          landmark: landmarkName || landmarkInput,
          lat: coords.lat,
          lng: coords.lng,
          distanceKm: result.distanceKm,
          deliveryFee: result.deliveryFee,
          durationMinutes: result.durationMinutes,
          tierDescription: result.tierDescription,
        });
      } catch (e) {
        console.error('Failed to compute delivery route:', e);
      } finally {
        setIsCalculating(false);
      }
    },
    [addressInput, landmarkInput, onLocationSelected]
  );

  useEffect(() => {
    runRouteCalculation(pinnedCoord, landmarkInput);
  }, [pinnedCoord]);

  // Handle GPS Locate button
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Verify roughly within Narayani / Birgunj zone (lat: 26.9 - 27.2, lng: 84.7 - 85.1)
        if (lat < 26.8 || lat > 27.2 || lng < 84.7 || lng > 85.1) {
          alert('GPS location appears to be outside Birgunj city area. Please pin directly on Birgunj map.');
        }
        setPinnedCoord({ lat, lng });
        setMapCenter({ lat, lng });
        setLandmarkInput('My Current GPS Location');
        setAddressInput(`GPS Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not access your location. Please select a landmark or pin on the map.');
      }
    );
  };

  // Landmark chip clicked
  const handleSelectLandmark = (lm: BirgunjLandmark) => {
    setPinnedCoord({ lat: lm.lat, lng: lm.lng });
    setMapCenter({ lat: lm.lat, lng: lm.lng });
    setLandmarkInput(lm.name);
    setAddressInput(`${lm.name}, Birgunj`);
  };

  // Saved address clicked
  const handleSelectSavedAddress = (saved: SavedAddress) => {
    setPinnedCoord({ lat: saved.lat, lng: saved.lng });
    setMapCenter({ lat: saved.lat, lng: saved.lng });
    setLandmarkInput(saved.landmark || saved.label);
    setAddressInput(saved.address);
  };

  // Save current location into customer's profile (up to 5 locations)
  const handleSaveCurrentLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    if (savedList.length >= 5) {
      setSaveError('You have reached the maximum limit of 5 saved delivery locations.');
      return;
    }

    try {
      const newAddr = await saveDeliveryAddress({
        label: saveLabel.trim() || 'Home',
        address: addressInput.trim() || landmarkInput,
        landmark: landmarkInput,
        lat: pinnedCoord.lat,
        lng: pinnedCoord.lng,
        isDefault: savedList.length === 0,
      });

      if (!user) {
        setGuestAddresses((prev) => [...prev, newAddr]);
      }

      setSaveSuccess(`"${newAddr.label}" saved successfully!`);
      setTimeout(() => {
        setShowSaveModal(false);
        setSaveSuccess(null);
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Could not save location');
    }
  };

  const handleDeleteSavedAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeDeliveryAddress(id);
      setGuestAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Error removing address:', err);
    }
  };

  // Interactive Map Canvas positioning
  // Calculate relative pixel offsets based on center coordinates
  const getMapPixelCoords = (lat: number, lng: number) => {
    const latSpan = 0.08 / Math.pow(2, zoom - 14);
    const lngSpan = 0.08 / Math.pow(2, zoom - 14);
    const x = ((lng - (mapCenter.lng - lngSpan / 2)) / lngSpan) * 100;
    const y = (((mapCenter.lat + latSpan / 2) - lat) / latSpan) * 100;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const storePx = getMapPixelCoords(STORE_COORDINATES.lat, STORE_COORDINATES.lng);
  const pinPx = getMapPixelCoords(pinnedCoord.lat, pinnedCoord.lng);

  return (
    <div className="space-y-4 bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200">
      {/* Header and Instruction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
              <MapPin className="w-4 h-4 text-[#E31B23]" />
            </span>
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">
              Pin Exact Delivery Location on Map
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Click on the map or choose a landmark. Rates obey Birgunj one-way traffic routes.
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <LocateFixed className="w-3.5 h-3.5 text-[#0047AB]" />
          <span>Use GPS Location</span>
        </button>
      </div>

      {/* SAVED DELIVERY ADDRESSES (UP TO 5) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-600" />
            <span>Saved Locations ({savedList.length}/5)</span>
          </label>
          {savedList.length < 5 && (
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="text-[11px] font-bold text-[#0047AB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Save current pin</span>
            </button>
          )}
        </div>

        {savedList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {savedList.map((addr) => {
              const isSelected =
                Math.abs(addr.lat - pinnedCoord.lat) < 0.001 &&
                Math.abs(addr.lng - pinnedCoord.lng) < 0.001;

              return (
                <div
                  key={addr.id}
                  onClick={() => handleSelectSavedAddress(addr)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30 text-stone-900 shadow-xs'
                      : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                        isSelected
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {addr.label}
                    </span>
                    <span className="truncate font-medium">{addr.address || addr.landmark}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSavedAddress(addr.id, e)}
                    className="p-1 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors ml-1"
                    title="Remove saved address"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-stone-400 italic">
            No saved locations yet. Pin your spot below and click "Save current pin" to save up to 5 locations!
          </p>
        )}
      </div>

      {/* QUICK BIRGUNJ LANDMARK PRESETS */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-stone-600 block">
          Quick Birgunj Areas & Landmark Presets:
        </label>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {BIRGUNJ_LANDMARKS.map((lm) => {
            const isSelected =
              Math.abs(lm.lat - pinnedCoord.lat) < 0.001 &&
              Math.abs(lm.lng - pinnedCoord.lng) < 0.001;

            return (
              <button
                key={lm.id}
                type="button"
                onClick={() => handleSelectLandmark(lm)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#164699] text-white border-[#164699] shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-100'
                }`}
              >
                <span>{lm.name.split(' (')[0]}</span>
                <span className="ml-1 text-[10px] opacity-75 font-mono">
                  Rs. {lm.typicalFee}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* INTERACTIVE MAP CANVAS WITH PINNING & LIVE ROUTE */}
      <div className="relative w-full h-[260px] sm:h-[300px] rounded-2xl overflow-hidden border border-stone-300 bg-stone-100 shadow-inner select-none">
        {/* Real-time map tile background representation of Birgunj street grid */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / rect.width;
            const clickY = (e.clientY - rect.top) / rect.height;

            const latSpan = 0.08 / Math.pow(2, zoom - 14);
            const lngSpan = 0.08 / Math.pow(2, zoom - 14);

            const clickedLng = mapCenter.lng - lngSpan / 2 + clickX * lngSpan;
            const clickedLat = mapCenter.lat + latSpan / 2 - clickY * latSpan;

            setPinnedCoord({ lat: clickedLat, lng: clickedLng });
            setAddressInput(`Birgunj Pinned Spot (Near ${landmarkInput})`);
          }}
          className="absolute inset-0 cursor-crosshair bg-slate-100 overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(#94a3b8 1px, transparent 1px),
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px, 48px 48px, 48px 48px',
          }}
        >
          {/* Birgunj Landmark Labels on Canvas */}
          <div className="absolute top-2 left-3 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-stone-600 border border-stone-200 shadow-xs pointer-events-none">
            Birgunj Traffic Map · One-Way Flow Active
          </div>

          {/* SVG Route Line between Hashtag Store and Customer Pin */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E31B23" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#0047AB" />
              </linearGradient>
            </defs>
            {/* Draw dogleg path reflecting oneway road network */}
            <path
              d={`M ${storePx.x}% ${storePx.y}% Q ${(storePx.x + pinPx.x) / 2 + 5}% ${(storePx.y + pinPx.y) / 2 - 5}%, ${pinPx.x}% ${pinPx.y}%`}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeDasharray="6,4"
              className="animate-pulse"
            />
          </svg>

          {/* Hashtag Pizza Restaurant Origin Pin */}
          <div
            style={{ left: `${storePx.x}%`, top: `${storePx.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none z-10 flex flex-col items-center"
          >
            <div className="bg-[#164699] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md whitespace-nowrap mb-0.5 border border-white/40">
              🍕 Hashtag Pizza (RB Complex)
            </div>
            <div className="w-6 h-6 rounded-full bg-[#E31B23] border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-black">
              ★
            </div>
          </div>

          {/* Customer's Pinned Delivery Destination Pin */}
          <div
            style={{ left: `${pinPx.x}%`, top: `${pinPx.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-full z-20 flex flex-col items-center pointer-events-none transition-all duration-150"
          >
            <div className="bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full text-[10px] font-black shadow-md whitespace-nowrap mb-0.5 border border-amber-600/40 animate-bounce">
              📍 Deliver Here
            </div>
            <div className="w-7 h-7 rounded-full bg-[#0047AB] border-2 border-white shadow-xl flex items-center justify-center text-white">
              <MapPin className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Interactive instruction watermark */}
          <div className="absolute bottom-2 right-2 bg-stone-900/80 text-white text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs font-medium pointer-events-none shadow-sm">
            💡 Click anywhere to move your delivery pin
          </div>
        </div>

        {/* Map Zoom Controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-30">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(18, z + 1))}
            className="w-7 h-7 bg-white hover:bg-stone-100 rounded-lg shadow border border-stone-200 flex items-center justify-center text-stone-700 font-bold text-sm cursor-pointer"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(12, z - 1))}
            className="w-7 h-7 bg-white hover:bg-stone-100 rounded-lg shadow border border-stone-200 flex items-center justify-center text-stone-700 font-bold text-sm cursor-pointer"
            title="Zoom out"
          >
            -
          </button>
        </div>
      </div>

      {/* Delivery Distance, Fee, and Oneway Traffic Summary Card */}
      {calculation && (
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
            <div>
              <p className="text-xs text-stone-500 font-medium">Calculated Road Distance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-extrabold text-stone-900 font-mono">
                  {calculation.distanceKm} km
                </span>
                <span className="text-xs text-stone-500">
                  (~{calculation.durationMinutes} mins rider ETA)
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-stone-500 font-medium">Official Delivery Fee</p>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-xs font-bold text-[#E31B23]">Rs.</span>
                <span className="text-2xl font-black text-[#E31B23] font-mono">
                  {calculation.deliveryFee}
                </span>
              </div>
            </div>
          </div>

          {/* Oneway Traffic & Tier Notice */}
          <div className="flex items-start gap-2 text-[11px] text-stone-600 bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-lg">
            <Car className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">
                {calculation.tierDescription}
              </p>
              <p className="text-stone-500 mt-0.5">
                {calculation.onewayNotice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Delivery Rates Reference Guide */}
      <div className="bg-stone-100/70 p-3 rounded-xl border border-stone-200 text-xs">
        <p className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>Hashtag Pizza Birgunj Delivery Rate Chart</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] text-stone-600">
          <div className="bg-white p-1.5 rounded border border-stone-200">
            <span className="font-bold text-stone-900">Up to 1.0 km:</span> Rs. 40
            <span className="block text-[10px] text-stone-400">Adarshnagar, Ghantaghar</span>
          </div>
          <div className="bg-white p-1.5 rounded border border-stone-200">
            <span className="font-bold text-stone-900">1.0 – 2.0 km:</span> Rs. 50
            <span className="block text-[10px] text-stone-400">Ranighat, Panitanki, Murli</span>
          </div>
          <div className="bg-white p-1.5 rounded border border-stone-200">
            <span className="font-bold text-stone-900">2.0 – 3.0 km:</span> Rs. 60
            <span className="block text-[10px] text-stone-400">Shreepur, Vishwa</span>
          </div>
          <div className="bg-white p-1.5 rounded border border-stone-200">
            <span className="font-bold text-stone-900">3.0 – 4.0 km:</span> Rs. 70
            <span className="block text-[10px] text-stone-400">Pipra, Powerhouse / Bypass</span>
          </div>
          <div className="bg-white p-1.5 rounded border border-stone-200">
            <span className="font-bold text-stone-900">4.0 – 5.0 km:</span> Rs. 80
            <span className="block text-[10px] text-stone-400">Customs / Inarwa, Gandak</span>
          </div>
          <div className="bg-white p-1.5 rounded border border-stone-200">
            <span className="font-bold text-stone-900">Above 5.0 km:</span> Rs. 80 + Rs. 15/km
            <span className="block text-[10px] text-stone-400">Long distance perimeter</span>
          </div>
        </div>
      </div>

      {/* MODAL TO SAVE ADDRESS (UP TO 5 LOCATIONS) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-amber-600" />
                <span>Save This Delivery Location</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCurrentLocation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Location Label (e.g. Home, Office, Shop)
                </label>
                <div className="flex gap-1.5 mb-2">
                  {['Home', 'Office', 'Shop', 'Friend', 'Other'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSaveLabel(preset)}
                      className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer border ${
                        saveLabel === preset
                          ? 'bg-amber-400 text-stone-950 border-amber-500'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  placeholder="Custom label..."
                  required
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#0047AB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Address / Nearby Landmark
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="e.g. Adarshnagar, Opp. Hotel Suraj"
                  required
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#0047AB]"
                />
              </div>

              <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200">
                📍 Coordinates: {pinnedCoord.lat.toFixed(4)}, {pinnedCoord.lng.toFixed(4)}
                <br />
                💰 Rate tier: {calculation?.tierDescription || 'Birgunj delivery zone'}
              </div>

              {saveError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium">
                  {saveError}
                </p>
              )}

              {saveSuccess && (
                <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{saveSuccess}</span>
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0047AB] hover:bg-[#003882] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Address ({savedList.length}/5)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
