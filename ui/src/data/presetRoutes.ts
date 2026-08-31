export interface PresetRoute {
  id: string;
  name: string;
  subtitle: string;
  origin: {
    name: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  tags: string[];
}

export const PRESET_ROUTES: PresetRoute[] = [
  {
    id: 'ghy-shl',
    name: 'Guwahati ➔ Shillong',
    subtitle: 'NH 6 Expressway Corridor (Assam to Meghalaya)',
    origin: {
      name: 'Guwahati, Assam',
      lat: 26.1445,
      lng: 91.7362,
    },
    destination: {
      name: 'Shillong, Meghalaya',
      lat: 25.5788,
      lng: 91.8933,
    },
    tags: ['Scenic Hill Road', '99 km', 'Interstate'],
  },
  {
    id: 'ghy-kzr',
    name: 'Guwahati ➔ Kaziranga',
    subtitle: 'Asian Highway 1 / NH 715 (Brahmaputra Valley)',
    origin: {
      name: 'Guwahati, Assam',
      lat: 26.1445,
      lng: 91.7362,
    },
    destination: {
      name: 'Kaziranga National Park, Assam',
      lat: 26.5775,
      lng: 93.1711,
    },
    tags: ['Logistics Trunk', '190 km', 'Wildlife Zone'],
  },
  {
    id: 'dmp-khm',
    name: 'Dimapur ➔ Kohima',
    subtitle: 'NH 29 Mountain Expressway (Nagaland)',
    origin: {
      name: 'Dimapur Railway Station, Nagaland',
      lat: 25.9068,
      lng: 93.7274,
    },
    destination: {
      name: 'Kohima City Center, Nagaland',
      lat: 25.6751,
      lng: 94.1086,
    },
    tags: ['Hill Transit', '74 km', 'Strategic Corridor'],
  },
  {
    id: 'agt-udp',
    name: 'Agartala ➔ Udaipur (Tripura)',
    subtitle: 'NH 8 Highway Corridor (South Tripura)',
    origin: {
      name: 'Agartala, Tripura',
      lat: 23.8315,
      lng: 91.2868,
    },
    destination: {
      name: 'Udaipur, Tripura',
      lat: 23.5337,
      lng: 91.4819,
    },
    tags: ['Valley Route', '52 km', 'Temple City'],
  },
  {
    id: 'slg-gtk',
    name: 'Siliguri ➔ Gangtok',
    subtitle: 'NH 10 Teesta River Highway (Bengal to Sikkim)',
    origin: {
      name: 'Siliguri Junction, West Bengal',
      lat: 26.7271,
      lng: 88.4239,
    },
    destination: {
      name: 'Gangtok, Sikkim',
      lat: 27.3389,
      lng: 88.6065,
    },
    tags: ['Himalayan Highway', '114 km', 'River Gorge'],
  },
];
