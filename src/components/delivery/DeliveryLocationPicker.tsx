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
    isOutOfRange?: boolean;
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
  const [geoFeedback, setGeoFeedback] = useState<string | null>(null);

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
  const [mapViewMode, setMapViewMode] = useState<'interactive' | 'google'>('interactive');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 27.015,
    lng: 84.878,
  });

  // Birgunj City Bounding Box for interactive coordinate projection
  const BIRGUNJ_BOUNDS = {
    minLat: 26.975,
    maxLat: 27.058,
    minLng: 84.845,
    maxLng: 84.918,
  };

  const coordToPercent = (lat: number, lng: number) => {
    const x = ((lng - BIRGUNJ_BOUNDS.minLng) / (BIRGUNJ_BOUNDS.maxLng - BIRGUNJ_BOUNDS.minLng)) * 100;
    const y = ((BIRGUNJ_BOUNDS.maxLat - lat) / (BIRGUNJ_BOUNDS.maxLat - BIRGUNJ_BOUNDS.minLat)) * 100;
    return {
      x: Math.max(3, Math.min(97, x)),
      y: Math.max(3, Math.min(97, y)),
    };
  };

  const handleInteractiveMapClick = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const clickY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const lng = BIRGUNJ_BOUNDS.minLng + (clickX / 100) * (BIRGUNJ_BOUNDS.maxLng - BIRGUNJ_BOUNDS.minLng);
    const lat = BIRGUNJ_BOUNDS.maxLat - (clickY / 100) * (BIRGUNJ_BOUNDS.maxLat - BIRGUNJ_BOUNDS.minLat);
    const newCoord = { lat, lng };

    // Find nearest Birgunj landmark
    let nearest = BIRGUNJ_LANDMARKS[0];
    let minD = 999;
    for (const lm of BIRGUNJ_LANDMARKS) {
      const d = Math.hypot(lm.lat - lat, lm.lng - lng);
      if (d < minD) {
        minD = d;
        nearest = lm;
      }
    }

    setPinnedCoord(newCoord);
    setLandmarkInput(`${nearest.name.split(' (')[0]} Area`);
    setAddressInput(`Pinned at ${nearest.area}, Birgunj (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

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
          isOutOfRange: result.isOutOfRange,
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
    setGeoFeedback(null);
    if (!navigator.geolocation) {
      setGeoFeedback('Geolocation is not supported by your browser. Please select a landmark or tap on the map.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Verify roughly within Narayani / Birgunj zone (lat: 26.9 - 27.2, lng: 84.7 - 85.1)
        if (lat < 26.8 || lat > 27.2 || lng < 84.7 || lng > 85.1) {
          setGeoFeedback('GPS location appears to be outside Birgunj city area. Please pin directly on the Birgunj map.');
        } else {
          setGeoFeedback('GPS location pinned successfully.');
        }
        setPinnedCoord({ lat, lng });
        setMapCenter({ lat, lng });
        setLandmarkInput('My Current GPS Location');
        setAddressInput(`GPS Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setTimeout(() => setGeoFeedback(null), 4000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoFeedback('Could not access your GPS location. Please select a landmark or pin on the map.');
        setTimeout(() => setGeoFeedback(null), 5000);
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

      {geoFeedback && (
        <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>{geoFeedback}</span>
        </div>
      )}

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

      {/* BIRGUNJ CITY MAP WITH EXACT PINPOINT ADDRESS & LIVE ROUTE */}
      <div className="space-y-2">
        {/* Map Header & View Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
            <Compass className="w-4 h-4 text-[#164699]" />
            <span>Birgunj City Map (Click or Tap to Pinpoint)</span>
          </div>

          <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setMapViewMode('interactive')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mapViewMode === 'interactive'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              📍 Tap to Pinpoint
            </button>
            <button
              type="button"
              onClick={() => setMapViewMode('google')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mapViewMode === 'google'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🗺️ Google Map
            </button>
          </div>
        </div>

        {/* Map View Container */}
        <div className="relative w-full h-[300px] sm:h-[340px] rounded-2xl overflow-hidden border border-stone-300 bg-slate-900 shadow-md select-none">
          {mapViewMode === 'interactive' ? (
            /* INTERACTIVE BIRGUNJ CITY PINPOINT CANVAS */
            <div
              onClick={handleInteractiveMapClick}
              className="relative w-full h-full cursor-crosshair overflow-hidden bg-[#0f172a]"
              title="Click anywhere to pin your doorstep in Birgunj"
            >
              {/* Background Map Grid & Roads (Birgunj City Network Simulation) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                <defs>
                  <pattern id="birgunj-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#birgunj-grid)" />

                {/* Main Arterial Roads */}
                {/* North-South Main Road (Gandak to Customs) */}
                <line x1="50%" y1="5%" x2="48%" y2="95%" stroke="#64748b" strokeWidth="4" />
                {/* Bypass / Link Road */}
                <line x1="15%" y1="65%" x2="85%" y2="35%" stroke="#475569" strokeWidth="3" strokeDasharray="6,4" />
                {/* East-West Adarshnagar / Ghantaghar Connectors */}
                <line x1="30%" y1="52%" x2="70%" y2="52%" stroke="#64748b" strokeWidth="2.5" />
                <line x1="20%" y1="38%" x2="80%" y2="40%" stroke="#475569" strokeWidth="2" />

                {/* 5.0 KM DELIVERY BOUNDARY RADIUS (Centered on store at ~48%, 52%) */}
                <circle
                  cx={coordToPercent(STORE_COORDINATES.lat, STORE_COORDINATES.lng).x + '%'}
                  cy={coordToPercent(STORE_COORDINATES.lat, STORE_COORDINATES.lng).y + '%'}
                  r="44%"
                  fill="rgba(16, 185, 129, 0.08)"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                />

                {/* Line between Store and Pinned Delivery Location */}
                <line
                  x1={coordToPercent(STORE_COORDINATES.lat, STORE_COORDINATES.lng).x + '%'}
                  y1={coordToPercent(STORE_COORDINATES.lat, STORE_COORDINATES.lng).y + '%'}
                  x2={coordToPercent(pinnedCoord.lat, pinnedCoord.lng).x + '%'}
                  y2={coordToPercent(pinnedCoord.lat, pinnedCoord.lng).y + '%'}
                  stroke={calculation?.isOutOfRange ? '#f43f5e' : '#38bdf8'}
                  strokeWidth="2.5"
                  strokeDasharray="4,3"
                />
              </svg>

              {/* 5 km Boundary Notice Ring Label */}
              <div
                className="absolute pointer-events-none text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40"
                style={{ top: '10px', right: '10px' }}
              >
                Max 5.0 Km Delivery Zone
              </div>

              {/* Landmarks on Map */}
              {BIRGUNJ_LANDMARKS.map((lm) => {
                const pos = coordToPercent(lm.lat, lm.lng);
                const isSelected =
                  Math.abs(lm.lat - pinnedCoord.lat) < 0.002 &&
                  Math.abs(lm.lng - pinnedCoord.lng) < 0.002;

                return (
                  <div
                    key={lm.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectLandmark(lm);
                    }}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-amber-400 border-white scale-150 ring-4 ring-amber-400/40'
                          : 'bg-slate-400 border-slate-600 group-hover:bg-white group-hover:scale-125'
                      }`}
                    />
                    <span className="hidden sm:block absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 whitespace-nowrap bg-slate-900/90 px-1 rounded shadow-xs opacity-75 group-hover:opacity-100">
                      {lm.name.split(' (')[0]}
                    </span>
                  </div>
                );
              })}

              {/* STORE PIN: Hashtag Pizza @ RB Complex */}
              {(() => {
                const storePos = coordToPercent(STORE_COORDINATES.lat, STORE_COORDINATES.lng);
                return (
                  <div
                    style={{ left: `${storePos.x}%`, top: `${storePos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                  >
                    <div className="relative flex flex-col items-center">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#E31B23] text-white text-[9px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap border border-white/40 mb-0.5">
                        🍕 Hashtag Pizza (RB Complex)
                      </span>
                      <div className="w-5 h-5 rounded-full bg-[#E31B23] text-white border-2 border-white flex items-center justify-center shadow-lg ring-4 ring-red-500/30">
                        <span className="text-[10px] font-black">★</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* CUSTOMER PINNED LOCATION */}
              {(() => {
                const pinPos = coordToPercent(pinnedCoord.lat, pinnedCoord.lng);
                const isOutOfRange = Boolean(calculation?.isOutOfRange);

                return (
                  <div
                    style={{ left: `${pinPos.x}%`, top: `${pinPos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-full z-30 transition-all duration-150 pointer-events-none"
                  >
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xl whitespace-nowrap border mb-1 flex items-center gap-1 ${
                          isOutOfRange
                            ? 'bg-rose-600 text-white border-rose-300 animate-bounce'
                            : 'bg-amber-400 text-stone-950 border-amber-500'
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>
                          {isOutOfRange
                            ? `⚠️ Outside 5km (${calculation?.distanceKm || 0} km)`
                            : `📍 Delivery Pin (${calculation?.distanceKm || 0} km)`}
                        </span>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-2xl ${
                          isOutOfRange
                            ? 'bg-rose-600 ring-8 ring-rose-500/40'
                            : 'bg-[#164699] ring-8 ring-blue-500/40'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="w-2 h-2 rounded-full bg-white/80 animate-ping mt-1" />
                    </div>
                  </div>
                );
              })()}

              {/* Floating Tap to Pin Instruction Banner */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[11px] shadow-lg border border-slate-700">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-amber-400">👉</span>
                  <span className="truncate">
                    Tap anywhere on map to pinpoint doorstep (Max 5 km within Birgunj)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseCurrentLocation();
                  }}
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline whitespace-nowrap cursor-pointer shrink-0"
                >
                  GPS Pin
                </button>
              </div>
            </div>
          ) : (
            /* GOOGLE MAPS EMBEDDED VIEW */
            <>
              <iframe
                title="Birgunj City Delivery Map"
                src={`https://maps.google.com/maps?q=${pinnedCoord.lat},${pinnedCoord.lng}&z=${zoom}&hl=en&output=embed`}
                className="w-full h-full border-0 pointer-events-auto"
                loading="lazy"
                referrerPolicy="no-referrer-when-cross-origin"
              />

              {/* Overlay Badge */}
              <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 max-w-[80%]">
                <div className="bg-stone-900/90 text-white backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md border border-stone-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">Birgunj Google Map View · 5.0 km Zone</span>
                </div>
                <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] text-stone-700 font-medium shadow-md border border-stone-200 truncate">
                  📍 Pinned: <span className="font-bold text-stone-900">{landmarkInput}</span>
                </div>
              </div>

              {/* Zoom & GPS Controls */}
              <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="p-2 bg-white hover:bg-amber-50 text-stone-800 hover:text-amber-700 rounded-xl shadow-lg border border-stone-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  title="Locate my current GPS address"
                  aria-label="Locate my current position"
                >
                  <LocateFixed className="w-4 h-4 text-[#0047AB]" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(18, z + 1))}
                  className="w-8 h-8 bg-white hover:bg-stone-100 rounded-xl shadow-lg border border-stone-200 flex items-center justify-center text-stone-800 font-black text-sm cursor-pointer"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(12, z - 1))}
                  className="w-8 h-8 bg-white hover:bg-stone-100 rounded-xl shadow-lg border border-stone-200 flex items-center justify-center text-stone-800 font-black text-sm cursor-pointer"
                  title="Zoom out"
                >
                  -
                </button>
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 bg-stone-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[11px] shadow-lg border border-stone-800">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Switch to "Tap to Pinpoint" to click anywhere</span>
                </div>
                <a
                  href={`https://maps.google.com/?q=${pinnedCoord.lat},${pinnedCoord.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline whitespace-nowrap cursor-pointer shrink-0"
                >
                  Open in Maps ↗
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delivery Distance, Fee, and Oneway Traffic Summary Card */}
      {calculation && (
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-xs space-y-2">
          {calculation.isOutOfRange ? (
            /* OUT OF RANGE BANNER (> 5.0 KM) */
            <div className="bg-rose-50 border-2 border-rose-300 p-3 rounded-xl text-rose-900 space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-rose-700">
                  Outside Delivery Range ({calculation.distanceKm} km away)
                </h4>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                We will only deliver till <strong>5 Km within Birgunj itself</strong>. We won't be able to deliver beyond Birgunj. Please pin your delivery address within 5 km or choose <strong>Take Away</strong> or <strong>Dine In</strong>.
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Explicit Delivery Rates Reference Guide */}
      <div className="bg-stone-100/70 p-3 rounded-xl border border-stone-200 text-xs">
        <p className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>Hashtag Pizza Birgunj Delivery Rate Chart (Max 5 km)</span>
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
          <div className="bg-rose-50 p-1.5 rounded border border-rose-200 text-rose-800">
            <span className="font-bold text-rose-900">Beyond 5.0 km:</span> Not Deliverable
            <span className="block text-[10px] text-rose-600">Max 5 km within Birgunj</span>
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
