import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  ArrowUpDown,
  Crosshair,
  Building2,
  Plane,
  Train,
  Loader2,
  X,
  MapPin,
} from 'lucide-react';
import { fetchAutosuggest, geocodePlace } from '../services/mapplsRouteService';
import type { PlaceSuggestion } from '../services/mapplsRouteService';

export interface LocationPoint {
  name: string;
  lat: number;
  lng: number;
}

interface RouteSearchBoxProps {
  token: string;
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  isLoadingRoute: boolean;
  onSetOrigin: (point: LocationPoint | null) => void;
  onSetDestination: (point: LocationPoint | null) => void;
  onCalculateRoute: (o?: LocationPoint, d?: LocationPoint) => void;
}

export const RouteSearchBox: React.FC<RouteSearchBoxProps> = ({
  token, origin, destination, isLoadingRoute,
  onSetOrigin, onSetDestination, onCalculateRoute,
}) => {
  const [oText, setOText] = useState(origin?.name || '');
  const [dText, setDText] = useState(destination?.name || '');
  const [oSug, setOSug] = useState<PlaceSuggestion[]>([]);
  const [dSug, setDSug] = useState<PlaceSuggestion[]>([]);
  const [drop, setDrop] = useState<'o' | 'd' | null>(null);
  const [searchO, setSearchO] = useState(false);
  const [searchD, setSearchD] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [gpsing, setGpsing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (origin) setOText(origin.name); }, [origin]);
  useEffect(() => { if (destination) setDText(destination.name); }, [destination]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setDrop(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Origin autosuggest
  useEffect(() => {
    if (!oText || oText === origin?.name || oText.trim().length < 2) { setOSug([]); return; }
    const t = setTimeout(async () => {
      setSearchO(true);
      setOSug(await fetchAutosuggest(oText, token));
      setSearchO(false);
      setDrop('o');
    }, 220);
    return () => clearTimeout(t);
  }, [oText, origin, token]);

  // Dest autosuggest
  useEffect(() => {
    if (!dText || dText === destination?.name || dText.trim().length < 2) { setDSug([]); return; }
    const t = setTimeout(async () => {
      setSearchD(true);
      setDSug(await fetchAutosuggest(dText, token, origin ? { lat: origin.lat, lng: origin.lng } : undefined));
      setSearchD(false);
      setDrop('d');
    }, 220);
    return () => clearTimeout(t);
  }, [dText, destination, origin, token]);

  const pick = async (item: PlaceSuggestion, tgt: 'o' | 'd') => {
    let lat = item.latitude, lng = item.longitude;
    if (!lat || !lng) {
      setResolving(true);
      const g = await geocodePlace(`${item.placeName}, ${item.placeAddress}`, token);
      setResolving(false);
      if (g) { lat = g.lat; lng = g.lng; }
    }
    if (lat && lng) {
      const p: LocationPoint = { name: item.placeName || item.placeAddress, lat, lng };
      tgt === 'o' ? (setOText(p.name), onSetOrigin(p)) : (setDText(p.name), onSetDestination(p));
    }
    setDrop(null);
  };

  const swap = () => {
    const to = origin, tt = oText;
    onSetOrigin(destination); setOText(dText);
    onSetDestination(to); setDText(tt);
  };

  const gps = () => {
    if (!navigator.geolocation) return;
    setGpsing(true);
    navigator.geolocation.getCurrentPosition(
      p => { setGpsing(false); const pt: LocationPoint = { name: 'Current Location', lat: p.coords.latitude, lng: p.coords.longitude }; setOText(pt.name); onSetOrigin(pt); },
      () => { setGpsing(false); const fb: LocationPoint = { name: 'Guwahati, Assam', lat: 26.1445, lng: 91.7362 }; setOText(fb.name); onSetOrigin(fb); },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDrop(null);
    let ao = origin, ad = destination;
    setResolving(true);
    try {
      if ((!ao || ao.name !== oText) && oText.trim()) {
        const g = await geocodePlace(oText, token);
        if (g) { ao = { name: oText, lat: g.lat, lng: g.lng }; onSetOrigin(ao); }
      }
      if ((!ad || ad.name !== dText) && dText.trim()) {
        const g = await geocodePlace(dText, token);
        if (g) { ad = { name: dText, lat: g.lat, lng: g.lng }; onSetDestination(ad); }
      }
    } finally { setResolving(false); }
    if (ao && ad) onCalculateRoute(ao, ad);
  };

  const icon = (t: string) => {
    const l = (t || '').toLowerCase();
    if (l.includes('airport')) return <Plane size={14} />;
    if (l.includes('rail') || l.includes('station')) return <Train size={14} />;
    if (l.includes('city') || l.includes('locality')) return <Building2 size={14} />;
    return <MapPin size={14} />;
  };

  return (
    <div className="search-card" ref={boxRef}>
      <form onSubmit={submit} className="search-form">
        {/* Origin */}
        <div className="search-row">
          <span className="marker-dot origin">A</span>
          <div className="search-input-wrap">
            <input placeholder="Starting point" value={oText}
              onChange={e => setOText(e.target.value)}
              onFocus={() => oSug.length && setDrop('o')}
              onKeyDown={e => e.key === 'Enter' && submit()} />
            {searchO && <Loader2 size={13} className="spin field-spinner" />}
            {oText && <button type="button" className="field-clear" onClick={() => { setOText(''); onSetOrigin(null); }}><X size={12} /></button>}
          </div>
          <button type="button" className="gps-btn" onClick={gps} disabled={gpsing}>
            {gpsing ? <Loader2 size={13} className="spin" /> : <Crosshair size={13} />}
          </button>
          {drop === 'o' && oSug.length > 0 && (
            <div className="suggest-drop">
              {oSug.map(s => (
                <div key={s.eLoc || s.placeName} className="suggest-item" onClick={() => pick(s, 'o')}>
                  <span className="suggest-icon">{icon(s.type)}</span>
                  <div className="suggest-text">
                    <span className="suggest-name">{s.placeName}</span>
                    {s.placeAddress && <span className="suggest-addr">{s.placeAddress}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap */}
        <div className="swap-line">
          <span className="dotted-line" />
          <button type="button" className="swap-btn" onClick={swap}><ArrowUpDown size={13} /></button>
        </div>

        {/* Destination */}
        <div className="search-row">
          <span className="marker-dot dest">B</span>
          <div className="search-input-wrap">
            <input placeholder="Destination" value={dText}
              onChange={e => setDText(e.target.value)}
              onFocus={() => dSug.length && setDrop('d')}
              onKeyDown={e => e.key === 'Enter' && submit()} />
            {searchD && <Loader2 size={13} className="spin field-spinner" />}
            {dText && <button type="button" className="field-clear" onClick={() => { setDText(''); onSetDestination(null); }}><X size={12} /></button>}
          </div>
          {drop === 'd' && dSug.length > 0 && (
            <div className="suggest-drop">
              {dSug.map(s => (
                <div key={s.eLoc || s.placeName} className="suggest-item" onClick={() => pick(s, 'd')}>
                  <span className="suggest-icon">{icon(s.type)}</span>
                  <div className="suggest-text">
                    <span className="suggest-name">{s.placeName}</span>
                    {s.placeAddress && <span className="suggest-addr">{s.placeAddress}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={(!oText.trim() && !origin) || (!dText.trim() && !destination) || isLoadingRoute || resolving} className="route-btn">
          {isLoadingRoute || resolving ? <><Loader2 size={15} className="spin" /> Finding route…</> : <><Navigation size={15} /> Get Directions</>}
        </button>
      </form>
    </div>
  );
};
