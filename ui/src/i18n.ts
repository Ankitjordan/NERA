import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';

export type LanguageCode =
  | 'en'
  | 'as'
  | 'bn'
  | 'brx'
  | 'kha'
  | 'grt'
  | 'mni'
  | 'lus'
  | 'njo'
  | 'ne'
  | 'trp'
  | 'inc';

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'as', nativeName: 'অসমীয়া', englishName: 'Assamese' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali' },
  { code: 'brx', nativeName: 'बड़ो', englishName: 'Bodo' },
  { code: 'kha', nativeName: 'ಕಾಸಿ', englishName: 'Khasi' },
  { code: 'grt', nativeName: 'A.chikku', englishName: 'Garo' },
  { code: 'mni', nativeName: 'মৈতৈলোন্', englishName: 'Meitei' },
  { code: 'lus', nativeName: 'Mizo', englishName: 'Mizo' },
  { code: 'njo', nativeName: 'Ao', englishName: 'Ao Naga' },
  { code: 'ne', nativeName: 'नेपाली', englishName: 'Nepali' },
  { code: 'trp', nativeName: 'ককবরক', englishName: 'Kokborok' },
  { code: 'inc', nativeName: 'Nyishi', englishName: 'Nyishi' },
];

export type TranslationKey =
  | 'navigator'
  | 'northEastRouteAnalytics'
  | 'language'
  | 'light'
  | 'dark'
  | 'active'
  | 'setKey'
  | 'configureMapplsKey'
  | 'startingPoint'
  | 'destination'
  | 'currentLocation'
  | 'getDirections'
  | 'startMockDriveTest'
  | 'findingRoute'
  | 'locationError'
  | 'startDrive'
  | 'endDrive'
  | 'total'
  | 'estimated'
  | 'covered'
  | 'left'
  | 'heading'
  | 'resume'
  | 'pause'
  | 'exitMockTest'
  | 'cruisingSpeed'
  | 'recenter'
  | 'zoomIn'
  | 'zoomOut'
  | 'mapUnavailable'
  | 'configureKey'
  | 'switchTo'
  | 'mode'
  | 'updatedRoutePreview'
  | 'updatedRoute'
  | 'closeRerouteAlert'
  | 'close'
  | 'diversionAhead'
  | 'couldNotCalculateRoute'
  | 'initializingRoadGraph'
  | 'coverageHint'
  | 'calculatingSafeRoute'
  | 'snappingToRoad'
  | 'runningPathfinder'
  | 'evaluatingHazards'
  | 'routeReady'
  | 'preparing'
  | 'aiSafetyAnalysis'
  | 'avoid'
  | 'caution'
  | 'recommendedSafeRoute'
  | 'validated';

type TranslationSet = Record<TranslationKey, string>;

const english: TranslationSet = {
  navigator: 'Navigator', northEastRouteAnalytics: 'North East Route Analytics', language: 'Language',
  light: 'Light', dark: 'Dark', active: 'Active', setKey: 'Set Key', configureMapplsKey: 'Configure Mappls Key',
  startingPoint: 'Starting point', destination: 'Destination', currentLocation: 'Current Location',
  getDirections: 'Get Directions', startMockDriveTest: 'Start Mock Drive Test', findingRoute: 'Finding route...',
  locationError: 'Choose a location from the suggestions or enter a more specific place name.',
  startDrive: 'Start Drive', endDrive: 'End Drive', total: 'total', estimated: 'est.', covered: 'covered',
  left: 'left', heading: 'heading', resume: 'Resume', pause: 'Pause', exitMockTest: 'Exit Mock Test',
  cruisingSpeed: 'Cruising Speed', recenter: 'Recenter', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  mapUnavailable: 'Map Unavailable', configureKey: 'Configure Key', switchTo: 'Switch to', mode: 'mode',
  updatedRoutePreview: 'Updated route preview', updatedRoute: 'Updated route',
  closeRerouteAlert: 'Close reroute alert', close: 'Close', diversionAhead: 'Diversion ahead at Nongpoh',
  couldNotCalculateRoute: 'Could not calculate directions between points.',
  initializingRoadGraph: 'Initializing NER Road Graph', coverageHint: '8-state NER coverage · first-time setup',
  calculatingSafeRoute: 'Calculating Safe Route', snappingToRoad: 'Snapping to nearest road…',
  runningPathfinder: 'Running A* pathfinder…', evaluatingHazards: 'Evaluating hazard zones…',
  routeReady: 'Route ready!', preparing: 'Preparing…', aiSafetyAnalysis: 'AI Safety Analysis',
  avoid: 'Avoid', caution: 'Caution', recommendedSafeRoute: 'Recommended Safe Route', validated: 'Validated',
};

const translated: Partial<Record<LanguageCode, Partial<TranslationSet>>> = {
  as: { navigator: 'নেভিগেটৰ', northEastRouteAnalytics: 'উত্তৰ-পূব পথ বিশ্লেষণ', language: 'ভাষা', light: 'পোহৰ', dark: 'আন্ধাৰ', active: 'সক্ৰিয়', setKey: 'কি ছেট কৰক', startingPoint: 'আৰম্ভণিৰ স্থান', destination: 'গন্তব্য', currentLocation: 'বৰ্তমান অৱস্থান', getDirections: 'দিশ নিৰ্ধাৰণ কৰক', findingRoute: 'পথ বিচাৰি আছে...', startDrive: 'যাত্ৰা আৰম্ভ', endDrive: 'যাত্ৰা শেষ', total: 'মুঠ', estimated: 'আনুমানিক', covered: 'অতিক্ৰম', left: 'বাকী', heading: 'দিশ', resume: 'পুনৰ আৰম্ভ', pause: 'বিৰতি', cruisingSpeed: 'গতি', recenter: 'পুনৰ কেন্দ্ৰীভূত', zoomIn: 'ডাঙৰ কৰক', zoomOut: 'সৰু কৰক' },
  bn: { navigator: 'ন্যাভিগেটর', northEastRouteAnalytics: 'উত্তর-পূর্ব রুট বিশ্লেষণ', language: 'ভাষা', light: 'আলো', dark: 'অন্ধকার', active: 'সক্রিয়', setKey: 'কী সেট করুন', startingPoint: 'শুরুর স্থান', destination: 'গন্তব্য', currentLocation: 'বর্তমান অবস্থান', getDirections: 'দিকনির্দেশ পান', findingRoute: 'রুট খোঁজা হচ্ছে...', startDrive: 'ড্রাইভ শুরু', endDrive: 'ড্রাইভ শেষ', total: 'মোট', estimated: 'আনুমানিক', covered: 'অতিক্রান্ত', left: 'বাকি', heading: 'দিক', resume: 'আবার শুরু', pause: 'বিরতি', cruisingSpeed: 'গতি', recenter: 'কেন্দ্রে আনুন', zoomIn: 'বড় করুন', zoomOut: 'ছোট করুন' },
  ne: { navigator: 'नेभिगेटर', northEastRouteAnalytics: 'उत्तर पूर्व मार्ग विश्लेषण', language: 'भाषा', light: 'उज्यालो', dark: 'अँध्यारो', active: 'सक्रिय', setKey: 'की सेट गर्नुहोस्', startingPoint: 'सुरुवाती स्थान', destination: 'गन्तव्य', currentLocation: 'हालको स्थान', getDirections: 'दिशा पाउनुहोस्', findingRoute: 'मार्ग खोजिँदैछ...', startDrive: 'ड्राइभ सुरु', endDrive: 'ड्राइभ अन्त्य', total: 'जम्मा', estimated: 'अनुमानित', covered: 'पार गरिएको', left: 'बाँकी', heading: 'दिशा', resume: 'पुनः सुरु', pause: 'रोक्नुहोस्', cruisingSpeed: 'गति', recenter: 'केन्द्रमा ल्याउनुहोस्', zoomIn: 'ठूलो बनाउनुहोस्', zoomOut: 'सानो बनाउनुहोस्' },
  mni: { navigator: 'ꯅꯦꯕꯤꯒꯦꯇꯔ', language: 'ꯂꯣꯟ', startingPoint: 'ꯍꯧꯖꯤꯛꯀꯤ ꯐꯝ', destination: 'ꯂꯛꯄꯗꯤ', getDirections: 'ꯃꯥꯔꯒ ꯐꯪꯕꯤꯌꯨ', startDrive: 'ꯆꯠꯄ ꯍꯧꯕ', endDrive: 'ꯆꯠꯄ ꯂꯣꯏꯕ', pause: 'ꯍꯪꯕ', resume: 'ꯍꯧꯗꯣꯛꯄ' },
  lus: { navigator: 'Khawchhuah', language: 'Ṭawng', startingPoint: 'Hmalakna hmun', destination: 'Thlenna hmun', getDirections: 'Kawng hriatna', startDrive: 'Kal tan', endDrive: 'Kal tawp', pause: 'Tawp chhung', resume: 'Tir leh' },
  trp: { navigator: 'ন্যাভিগেটর', language: 'রওং', startingPoint: 'ফাংনা থাং', destination: 'থাংমুন', getDirections: 'থাং হাবায়', startMockDriveTest: 'মক ড্রাইভ শুরু', startDrive: 'যাত্রা হাবায়', endDrive: 'যাত্রা থামায়' },
  brx: { navigator: 'नेभिगेटर', language: 'राव', startingPoint: 'जागोनाय जायगा', destination: 'फैजायगोन', getDirections: 'दिगोनाय', startDrive: 'ड्राइभ जागोन', endDrive: 'ड्राइभ बन्द', pause: 'फोसाब', resume: 'फिन जागोन' },
  kha: { navigator: 'Nongleit', language: 'Ktien', startingPoint: 'Ka jaka sdang', destination: 'Ka jaka poi', getDirections: 'Pyni ia ka lynti', startDrive: 'Sdang ia ka jingleit', endDrive: 'Pynkut ia ka jingleit', pause: 'Sangeh', resume: 'Sdang biang' },
  grt: { navigator: 'Nokgiparang', language: 'Ku∙sik', startingPoint: 'A∙bachenggipa biap', destination: 'Sokani biap', getDirections: 'Re∙angani ramram', startDrive: 'Re∙ang dakchak', endDrive: 'Re∙ang bonata', pause: 'Dongchak', resume: 'Kene re∙ang' },
  njo: { navigator: 'Nokinkettsür', language: 'Oshi', startingPoint: 'Areni otsü', destination: 'Areni tsür', getDirections: 'Otsü sayu', startDrive: 'Otsü tenzük', endDrive: 'Otsü temzüker', pause: 'Atsü', resume: 'Kene tenzük' },
  inc: { navigator: 'Nehvigeitor', language: 'Acho', startingPoint: 'Acho nyi', destination: 'Acho pyi', getDirections: 'Lam apuk', startDrive: 'Lam nyi', endDrive: 'Lam pyi', pause: 'Tali', resume: 'Tali nyi' },
};

export const getTranslations = (language: LanguageCode): TranslationSet => ({
  ...english,
  ...(translated[language] || {}),
});

export interface I18nValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nValue | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<LanguageCode>('en');
  const translations = getTranslations(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return createElement(
    I18nContext.Provider,
    { value: { language, setLanguage, t: (key) => translations[key] } },
    children,
  );
};

export const useI18n = (): I18nValue => {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nContext.Provider');
  return value;
};