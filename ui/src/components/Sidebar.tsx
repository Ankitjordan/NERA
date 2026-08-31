import React, { useState } from 'react';
import { Search, MapPin, Building2, Users, Maximize2, ChevronRight, Activity } from 'lucide-react';
import { NORTH_EAST_STATES } from '../data/northEastStates';
import type { NorthEastState } from '../data/northEastStates';

interface SidebarProps {
  selectedState: NorthEastState | null;
  onSelectState: (state: NorthEastState | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ selectedState, onSelectState }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStates = NORTH_EAST_STATES.filter((st) =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.capital.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.keyHubs.some((hub) => hub.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <aside className="sidebar-container">
      {/* Search Header */}
      <div className="sidebar-search-box">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search state, capital, or hub..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Selected State Spotlight if any */}
      {selectedState ? (
        <div className="state-spotlight-card" style={{ borderTopColor: selectedState.color }}>
          <div className="spotlight-header">
            <div>
              <span className="spotlight-tag" style={{ color: selectedState.color }}>
                Active State Focus
              </span>
              <h2 className="spotlight-title">{selectedState.name}</h2>
              <div className="spotlight-capital">
                <Building2 size={13} />
                <span>Capital: {selectedState.capital}</span>
              </div>
            </div>
            <button
              onClick={() => onSelectState(null)}
              className="spotlight-close-btn"
              title="Return to full region overview"
            >
              Reset View
            </button>
          </div>

          <p className="spotlight-desc">{selectedState.description}</p>

          <div className="spotlight-stats-grid">
            <div className="stat-box">
              <span className="stat-label">
                <Users size={12} /> Population
              </span>
              <span className="stat-value">{selectedState.population}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">
                <Maximize2 size={12} /> Area
              </span>
              <span className="stat-value">{selectedState.area}</span>
            </div>
          </div>

          <div className="spotlight-hubs-section">
            <span className="hubs-title">Key Strategic & Logistics Hubs</span>
            <div className="hubs-tags">
              {selectedState.keyHubs.map((hub) => (
                <span key={hub} className="hub-tag">
                  <MapPin size={11} /> {hub}
                </span>
              ))}
            </div>
          </div>

          <div className="spotlight-coords">
            <span>Coordinates:</span>
            <code>
              {selectedState.lat.toFixed(4)}° N, {selectedState.lng.toFixed(4)}° E
            </code>
          </div>
        </div>
      ) : (
        <div className="region-overview-banner">
          <div className="region-banner-header">
            <Activity size={18} className="banner-icon" />
            <div>
              <h3 className="banner-heading">North East India (8 States)</h3>
              <p className="banner-sub">Select any state below to focus map & inspect key hubs</p>
            </div>
          </div>
        </div>
      )}

      {/* State List */}
      <div className="state-list-container">
        <div className="state-list-title-row">
          <span className="list-title">States & Territories</span>
          <span className="list-count">{filteredStates.length} / 8</span>
        </div>

        <div className="state-cards-scroll">
          {filteredStates.map((st) => {
            const isSelected = selectedState?.id === st.id;
            return (
              <div
                key={st.id}
                className={`state-item-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectState(isSelected ? null : st)}
              >
                <div className="state-item-stripe" style={{ backgroundColor: st.color }} />
                <div className="state-item-content">
                  <div className="state-item-top">
                    <h4 className="state-item-name">{st.name}</h4>
                    <ChevronRight size={15} className="chevron-icon" />
                  </div>
                  <div className="state-item-meta">
                    <span>
                      <Building2 size={12} /> {st.capital}
                    </span>
                    <span>•</span>
                    <span>{st.keyHubs.length} Key Hubs</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
