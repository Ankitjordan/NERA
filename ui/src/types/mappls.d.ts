export interface MapplsMarkerOptions {
  map: any;
  position: { lat: number; lng: number };
  fitbounds?: boolean;
  icon_name?: string;
  popupHtml?: string;
  title?: string;
  draggable?: boolean;
  html?: string | HTMLElement;
  offset?: [number, number];
  [key: string]: any;
}

export interface MapplsMapOptions {
  center: { lat: number; lng: number } | [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomControl?: boolean;
  hybrid?: boolean;
  location?: boolean;
  fullscreen?: boolean;
  traffic?: boolean;
}

declare global {
  interface Window {
    mappls?: {
      Map: new (container: string | HTMLElement, options: MapplsMapOptions) => any;
      Marker: new (options: MapplsMarkerOptions) => any;
      InfoWindow: new (options: any) => any;
      Polyline?: new (options: any) => any;
      Polygon?: new (options: any) => any;
      remove?: (options: { map: any; layer: any }) => void;
      [key: string]: any;
    };
  }
}
