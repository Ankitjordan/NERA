export interface NorthEastState {
  id: string;
  name: string;
  capital: string;
  lat: number;
  lng: number;
  zoom: number;
  description: string;
  population: string;
  area: string;
  keyHubs: string[];
  color: string;
}

export const NORTH_EAST_CENTER = {
  lat: 26.2006,
  lng: 92.9376,
  zoom: 7,
};

export const NORTH_EAST_STATES: NorthEastState[] = [
  {
    id: 'assam',
    name: 'Assam',
    capital: 'Dispur / Guwahati',
    lat: 26.1445,
    lng: 91.7362,
    zoom: 8,
    description: 'The commercial and logistics gateway to North-East India, famous for tea and the Brahmaputra river.',
    population: '35.6M',
    area: '78,438 sq km',
    keyHubs: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
    color: '#10b981',
  },
  {
    id: 'arunachal-pradesh',
    name: 'Arunachal Pradesh',
    capital: 'Itanagar',
    lat: 27.0844,
    lng: 93.6053,
    zoom: 8,
    description: 'The Land of the Dawn-Lit Mountains, the easternmost frontier state with rich biodiversity.',
    population: '1.5M',
    area: '83,743 sq km',
    keyHubs: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
    color: '#3b82f6',
  },
  {
    id: 'meghalaya',
    name: 'Meghalaya',
    capital: 'Shillong',
    lat: 25.5788,
    lng: 91.8933,
    zoom: 9,
    description: 'The Abode of Clouds, renowned for living root bridges, waterfalls, and scenic highland plateaus.',
    population: '3.3M',
    area: '22,429 sq km',
    keyHubs: ['Shillong', 'Tura', 'Jowai', 'Cherrapunji', 'Nongpoh'],
    color: '#06b6d4',
  },
  {
    id: 'manipur',
    name: 'Manipur',
    capital: 'Imphal',
    lat: 24.8170,
    lng: 93.9368,
    zoom: 9,
    description: 'The Jewel of India, known for Loktak Lake, rich cultural traditions, and strategic border transit.',
    population: '3.2M',
    area: '22,327 sq km',
    keyHubs: ['Imphal', 'Churachandpur', 'Thoubal', 'Ukhrul', 'Moreh'],
    color: '#8b5cf6',
  },
  {
    id: 'mizoram',
    name: 'Mizoram',
    capital: 'Aizawl',
    lat: 23.7271,
    lng: 92.7176,
    zoom: 9,
    description: 'The Land of the Hill People, known for lush rolling hills and high literacy rates.',
    population: '1.2M',
    area: '21,081 sq km',
    keyHubs: ['Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip'],
    color: '#ec4899',
  },
  {
    id: 'nagaland',
    name: 'Nagaland',
    capital: 'Kohima',
    lat: 25.6751,
    lng: 94.1086,
    zoom: 9,
    description: 'The Land of Festivals, mountainous terrain with rich indigenous heritage and the Hornbill Festival.',
    population: '2.2M',
    area: '16,579 sq km',
    keyHubs: ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'],
    color: '#f59e0b',
  },
  {
    id: 'tripura',
    name: 'Tripura',
    capital: 'Agartala',
    lat: 23.8315,
    lng: 91.2868,
    zoom: 9,
    description: 'Surrounded by Bangladesh on three sides, rich in palace architecture, bamboo crafts, and rubber.',
    population: '4.1M',
    area: '10,491 sq km',
    keyHubs: ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailashahar', 'Belonia'],
    color: '#ef4444',
  },
  {
    id: 'sikkim',
    name: 'Sikkim',
    capital: 'Gangtok',
    lat: 27.3389,
    lng: 88.6065,
    zoom: 9,
    description: 'Nestled in the Himalayas beneath Mount Kangchenjunga, India’s first 100% organic state.',
    population: '0.69M',
    area: '7,096 sq km',
    keyHubs: ['Gangtok', 'Namchi', 'Geyzing', 'Mangan', 'Rangpo'],
    color: '#14b8a6',
  },
];
