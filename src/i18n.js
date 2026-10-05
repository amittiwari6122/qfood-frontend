import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { t: {
    overview: 'Overview', wasteMgmt: 'Waste management', donate: 'Donate food', myDonations: 'My donations', requests: 'Food requests', available: 'Available food',
    matches: 'Quantum matches', quantum: 'Quantum engine', deliveries: 'Deliveries', chat: 'Chat', notifications: 'Notifications',
    feedback: 'Feedback', analytics: 'Analytics', admin: 'Verification', market: 'Food deals', profile: 'Profile', logout: 'Sign out',
    usableFor: 'Usable for', expired: 'Expired', accept: 'Accept', reject: 'Decline', heroTitle: 'Turning Surplus Food Into Shared Hope',
    heroSub: 'AI-powered food quality analysis, quantum-optimized matching and real-time delivery tracking for smarter food redistribution.',
    getStarted: 'Get started', login: 'Sign in', register: 'Create account',
  } },
  hi: { t: {
    overview: 'सारांश', donate: 'भोजन दान करें', myDonations: 'मेरे दान', requests: 'भोजन अनुरोध', available: 'उपलब्ध भोजन',
    matches: 'क्वांटम मिलान', quantum: 'क्वांटम इंजन', deliveries: 'डिलीवरी', chat: 'चैट', notifications: 'सूचनाएँ',
    feedback: 'प्रतिक्रिया', analytics: 'विश्लेषण', admin: 'सत्यापन', market: 'भोजन ऑफ़र', profile: 'प्रोफ़ाइल', logout: 'साइन आउट',
    usableFor: 'उपयोग योग्य', expired: 'समाप्त', accept: 'स्वीकारें', reject: 'अस्वीकारें', heroTitle: 'बचे हुए भोजन को साझा उम्मीद में बदलना',
    heroSub: 'एआई से भोजन गुणवत्ता जाँच, क्वांटम-अनुकूलित मिलान और लाइव डिलीवरी ट्रैकिंग।',
    getStarted: 'शुरू करें', login: 'साइन इन', register: 'खाता बनाएँ',
  } },
  mr: { t: {
    overview: 'आढावा', donate: 'अन्न दान करा', myDonations: 'माझे दान', requests: 'अन्न विनंत्या', available: 'उपलब्ध अन्न',
    matches: 'क्वांटम जुळणी', quantum: 'क्वांटम इंजिन', deliveries: 'डिलिव्हरी', chat: 'चॅट', notifications: 'सूचना',
    feedback: 'अभिप्राय', analytics: 'विश्लेषण', admin: 'पडताळणी', market: 'अन्न ऑफर', profile: 'प्रोफाइल', logout: 'साइन आउट',
    usableFor: 'वापरण्यायोग्य', expired: 'कालबाह्य', accept: 'स्वीकारा', reject: 'नाकारा', heroTitle: 'उरलेल्या अन्नातून सामायिक आशा',
    heroSub: 'एआय अन्न गुणवत्ता तपासणी, क्वांटम-अनुकूल जुळणी आणि थेट डिलिव्हरी ट्रॅकिंग.',
    getStarted: 'सुरू करा', login: 'साइन इन', register: 'खाते तयार करा',
  } },
};
i18n.use(initReactI18next).init({ resources, defaultNS: 't', lng: localStorage.getItem('lang') || 'en', fallbackLng: 'en', interpolation: { escapeValue: false } });
export default i18n;
