import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Leaf,
  LayoutDashboard,
  Radio,
  Droplets,
  CloudSun,
  BarChart3,
  Zap,
  Brain,
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  XCircle,
  Clock,
  Send,
  Sprout,
  Wheat,
  Flower2,
  MapPin,
  Navigation,
  User,
  Languages,
  Sun,
  Moon,
  HelpCircle,
  Mail,
  Phone,
  MessageCircle,
  ChevronDown,
  CheckCircle2,
  Copy,
  Router,
  ShieldCheck,
  Wifi,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import LanguageSelect, { languages } from "../components/LanguageSelect";
import { toast } from "sonner";
import { API } from "../lib/api";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatChatHtml = (value) =>
  escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

const humanizeApiValue = (value, fallback = "") => {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => humanizeApiValue(item))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    if (typeof value.msg === "string") return value.msg;
    if (typeof value.message === "string") return value.message;
    if (typeof value.detail === "string") return value.detail;
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

// Color system
const lightColors = {
  greenDark: "#1e3a2f",
  greenMid: "#2d5a3d",
  greenAccent: "#3a6b4a",
  greenLight: "#4a8a5a",
  terracotta: "#c96a4a",
  terracottaLight: "#d4795c",
  cream: "#f0ece4",
  creamDark: "#e8e3d8",
  gold: "#c8a84b",
  goldLight: "#e8c86b",
  blue: "#3a7ab5",
  blueLight: "#5a9ad5",
  red: "#c94a3a",
  textDark: "#1a2820",
  textMid: "#4a5548",
  textLight: "#8a9488",
  bodyBg: "#f5f2ec",
};

const darkColors = {
  ...lightColors,
  greenDark: "#10261c",
  greenMid: "#1f4633",
  greenAccent: "#2f6a4d",
  cream: "#1c2921",
  creamDark: "#314238",
  textDark: "#f5f2ec",
  textMid: "#cbd6ce",
  textLight: "#91a195",
  bodyBg: "#0d1712",
};

const dashboardCopy = {
  en: {
    dashboard: "Dashboard",
    dashboardSubtitle: "Farm overview and insights",
    sensors: "Sensors",
    sensorsSubtitle: "Live sensor data and readings",
    pump: "Pump Control",
    pumpSubtitle: "Irrigation management",
    weather: "Weather",
    notifications: "Notifications",
    market: "Market Prices",
    flow: "System Flow",
    ai: "AI Assistant",
    settings: "Settings",
    profile: "Profile",
    overview: "Overview",
    control: "Control",
    intelligence: "Intelligence",
    farmDashboard: "Farm Dashboard",
    status: "Status",
    running: "Running",
    stopped: "Stopped",
    runtime: "Runtime",
    autoMode: "Auto Mode Active",
    scheduledTimers: "Scheduled Timers",
    addTimer: "+ Add Timer",
    noTimers: "No timers scheduled",
    scheduleTimer: "Schedule Timer",
    startTime: "Start Time",
    duration: "Duration (minutes)",
    days: "Days (leave empty for daily)",
    cancel: "Cancel",
    saveTimer: "Save Timer",
    language: "Language / भाषा",
    appearance: "Appearance",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    live: "Live",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    dashboardSubtitle: "खेत का सारांश और जानकारी",
    sensors: "सेंसर",
    sensorsSubtitle: "लाइव सेंसर डेटा और रीडिंग",
    pump: "पंप नियंत्रण",
    pumpSubtitle: "सिंचाई प्रबंधन",
    weather: "मौसम",
    market: "बाज़ार भाव",
    flow: "सिस्टम फ्लो",
    ai: "AI सहायक",
    settings: "सेटिंग्स",
    profile: "प्रोफाइल",
    overview: "सारांश",
    control: "नियंत्रण",
    intelligence: "जानकारी",
    farmDashboard: "फार्म डैशबोर्ड",
    status: "स्थिति",
    running: "चल रहा है",
    stopped: "बंद",
    runtime: "चलने का समय",
    autoMode: "ऑटो मोड सक्रिय",
    scheduledTimers: "निर्धारित टाइमर",
    addTimer: "+ टाइमर जोड़ें",
    noTimers: "कोई टाइमर नहीं",
    scheduleTimer: "टाइमर सेट करें",
    startTime: "शुरू होने का समय",
    duration: "अवधि (मिनट)",
    days: "दिन (खाली छोड़ें तो रोज़)",
    cancel: "रद्द करें",
    saveTimer: "टाइमर सेव करें",
    language: "भाषा",
    appearance: "रूप",
    lightMode: "लाइट मोड",
    darkMode: "डार्क मोड",
    live: "लाइव",
  },
  mr: {
    dashboard: "डॅशबोर्ड",
    sensors: "सेन्सर",
    pump: "पंप नियंत्रण",
    weather: "हवामान",
    market: "बाजार भाव",
    flow: "सिस्टम फ्लो",
    ai: "AI सहाय्यक",
    settings: "सेटिंग्ज",
    profile: "प्रोफाइल",
    status: "स्थिती",
    running: "चालू",
    stopped: "बंद",
    scheduledTimers: "नियोजित टाइमर",
    addTimer: "+ टाइमर जोडा",
    noTimers: "टाइमर नाहीत",
    saveTimer: "टाइमर सेव करा",
    language: "भाषा",
    lightMode: "लाइट मोड",
    darkMode: "डार्क मोड",
  },
  te: {
    dashboard: "డాష్‌బోర్డ్",
    sensors: "సెన్సర్లు",
    pump: "పంప్ నియంత్రణ",
    weather: "వాతావరణం",
    market: "మార్కెట్ ధరలు",
    ai: "AI సహాయకుడు",
    settings: "సెట్టింగ్‌లు",
    profile: "ప్రొఫైల్",
    status: "స్థితి",
    running: "నడుస్తోంది",
    stopped: "ఆగింది",
    scheduledTimers: "షెడ్యూల్ టైమర్లు",
    addTimer: "+ టైమర్ జోడించు",
    noTimers: "టైమర్లు లేవు",
    saveTimer: "టైమర్ సేవ్ చేయి",
    language: "భాష",
    lightMode: "లైట్ మోడ్",
    darkMode: "డార్క్ మోడ్",
  },
  ta: {
    dashboard: "டாஷ்போர்டு",
    sensors: "சென்சார்கள்",
    pump: "பம்ப் கட்டுப்பாடு",
    weather: "வானிலை",
    market: "சந்தை விலை",
    ai: "AI உதவியாளர்",
    settings: "அமைப்புகள்",
    profile: "சுயவிவரம்",
    status: "நிலை",
    running: "இயங்குகிறது",
    stopped: "நிறுத்தப்பட்டது",
    scheduledTimers: "திட்டமிட்ட டைமர்கள்",
    addTimer: "+ டைமர் சேர்க்க",
    noTimers: "டைமர்கள் இல்லை",
    saveTimer: "டைமர் சேமி",
    language: "மொழி",
    lightMode: "லைட் மோடு",
    darkMode: "டார்க் மோடு",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড",
    sensors: "সেন্সর",
    pump: "পাম্প নিয়ন্ত্রণ",
    weather: "আবহাওয়া",
    market: "বাজার দর",
    ai: "AI সহায়ক",
    settings: "সেটিংস",
    profile: "প্রোফাইল",
    status: "অবস্থা",
    running: "চলছে",
    stopped: "বন্ধ",
    scheduledTimers: "নির্ধারিত টাইমার",
    addTimer: "+ টাইমার যোগ",
    noTimers: "কোনো টাইমার নেই",
    saveTimer: "টাইমার সেভ",
    language: "ভাষা",
    lightMode: "লাইট মোড",
    darkMode: "ডার্ক মোড",
  },
  kn: {
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    sensors: "ಸೆನ್ಸರ್‌ಗಳು",
    pump: "ಪಂಪ್ ನಿಯಂತ್ರಣ",
    weather: "ಹವಾಮಾನ",
    market: "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ",
    ai: "AI ಸಹಾಯಕ",
    settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    profile: "ಪ್ರೊಫೈಲ್",
    status: "ಸ್ಥಿತಿ",
    running: "ಚಾಲುತ್ತಿದೆ",
    stopped: "ನಿಂತಿದೆ",
    scheduledTimers: "ನಿಗದಿತ ಟೈಮರ್‌ಗಳು",
    addTimer: "+ ಟೈಮರ್ ಸೇರಿಸಿ",
    noTimers: "ಟೈಮರ್‌ಗಳಿಲ್ಲ",
    saveTimer: "ಟೈಮರ್ ಉಳಿಸಿ",
    language: "ಭಾಷೆ",
    lightMode: "ಲೈಟ್ ಮೋಡ್",
    darkMode: "ಡಾರ್ಕ್ ಮೋಡ್",
  },
};

const chatCopy = {
  en: {
    chatWelcome: "Welcome back, {name}! 🌿 Your farm sensors are online. Soil moisture is {moisture}%, temperature is {temp}°C, humidity is {hum}%. How can I help?",
    chatDefault: "I'm monitoring your farm in real time. Soil moisture is **{moisture}%**, temperature is **{temp}°C**, humidity is **{hum}%**. What would you like to know?",
    chatSuggestionIrrigate: "When should I irrigate?",
    chatSuggestionFertilizer: "Fertilizer recommendations for wheat",
    chatSuggestionSellOnions: "Should I sell onions now?",
    chatSuggestionPhZoneB: "pH level in Zone B",
    chatSuggestionWeather: "7-day weather prediction",
    chatPlaceholder: "Ask about your farm...",
    chatResponseIrrigate: "Your soil moisture is {moisture}%, so irrigation is recommended if it drops below 55%. Keep an eye on the forecast before scheduling.",
    chatResponseFertilizer: "For wheat, apply a balanced NPK mix now. Use nitrogen-rich fertilizer if the crop is tillering.",
    chatResponseSellOnions: "Onion prices are strong. If your crop is ready, selling now would likely capture good local mandi rates.",
    chatResponsePh: "Zone B pH is {ph}. That is within a healthy range for most crops, but adjust with lime if it falls below 6.0.",
    chatResponseWeather: "The 7-day outlook is mostly stable, with a chance of light showers midweek. Monitor humidity before irrigating.",
  },
  hi: {
    chatWelcome: "स्वागत है, {name}! 🌿 आपके खेत के सेंसर ऑनलाइन हैं। मिट्टी की नमी {moisture}%, तापमान {temp}°C, आद्रता {hum}% है। मैं आपकी कैसे मदद कर सकता हूँ?",
    chatDefault: "मैं आपके खेत का डेटा रीयल-टाइम में देख रहा हूँ। मिट्टी की नमी **{moisture}%**, तापमान **{temp}°C**, आद्रता **{hum}%**। आप क्या जानना चाहेंगे?",
    chatSuggestionIrrigate: "मुझे बताएं कब सिंचाई करनी चाहिए?",
    chatSuggestionFertilizer: "गेहूं के लिए उर्वरक सुझाव",
    chatSuggestionSellOnions: "क्या मुझे प्याज अभी बेच देना चाहिए?",
    chatSuggestionPhZoneB: "जोन B में pH स्तर",
    chatSuggestionWeather: "7-दिन का मौसम पूर्वानुमान",
    chatPlaceholder: "अपने खेत के बारे में पूछें...",
    chatResponseIrrigate: "मिट्टी की नमी {moisture}% है, इसलिए यदि यह 55% से नीचे गिरती है तो सिंचाई करें। शेड्यूल करने से पहले मौसम की जाँच करें।",
    chatResponseFertilizer: "गेहूं के लिए अभी संतुलित NPK उर्वरक लगाएं। यदि फसल टिलरिंग में है तो नाइट्रोजन युक्त उर्वरक का प्रयोग करें।",
    chatResponseSellOnions: "प्याज की कीमतें अच्छी हैं। अगर आपकी फसल तैयार है, तो अब बेचने से स्थानीय मंडी भाव बेहतर मिल सकते हैं।",
    chatResponsePh: "जोन B का pH {ph} है। यह अधिकांश फसलों के लिए स्वस्थ सीमा में है, लेकिन यदि यह 6.0 से नीचे हो तो चुना मिलाएं।",
    chatResponseWeather: "7-दिन की संभावना स्थिर है, मध्य सप्ताह में हल्की बारिश हो सकती है। सिंचाई से पहले आद्रता पर ध्यान दें।",
  },
  mr: {
    chatWelcome: "पुन्हा स्वागत आहे, {name}! 🌿 तुमचे शेत सेन्सर्स ऑनलाइन आहेत. मातीतील आर्द्रता {moisture}%, तापमान {temp}°C, आद्रता {hum}% आहे. मी कशी मदत करू?",
    chatDefault: "मी तुमच्या शेताचे डेटा रिअल-टाइममध्ये पाहतोय. मातीतील आर्द्रता **{moisture}%**, तापमान **{temp}°C**, आद्रता **{hum}%**. तुम्हाला काय जाणून घ्यायचं आहे?",
    chatSuggestionIrrigate: "मला सांगा कधी पाणी द्यावं?",
    chatSuggestionFertilizer: "गहूंसाठी खताचे शिफारसी",
    chatSuggestionSellOnions: "मला कांदे आता विकावे का?",
    chatSuggestionPhZoneB: "झोन B मधील pH पातळी",
    chatSuggestionWeather: "7 दिवसांचे हवामान अंदाज",
    chatPlaceholder: "तुमच्या शेताबद्दल विचारा...",
    chatResponseIrrigate: "मातीची आर्द्रता {moisture}% आहे, म्हणून ती 55% खाली गेली तर सिंचन करावे. वेळापत्रक करण्यापूर्वी हवामान पहा.",
    chatResponseFertilizer: "गहूंसाठी सध्या संतुलित NPK खत वापरा. जर पीक टिलरिंग अवस्थेत असेल तर नायट्रोजनयुक्त खत वापरा.",
    chatResponseSellOnions: "कांद्याच्या किमती चांगल्या आहेत. तुमचे पीक तयार असल्यास आता विकल्यास स्थानिक मंडप दर चांगले मिळू शकतात.",
    chatResponsePh: "झोन B चा pH {ph} आहे. हे बहुतेक पिकांसाठी चांगल्या श्रेणीत आहे, परंतु हे 6.0 खाली असल्यास चुना घाला.",
    chatResponseWeather: "7 दिवसांचा अंदाज स्थिर दिसतो, मध्य आठवड्यात हलकी पाऊसाची शक्यता आहे. सिंचनाआधी आद्रतेकडे लक्ष द्या.",
  },
  te: {
    chatWelcome: "వెళ్ళిరాగా స్వాగతం, {name}! 🌿 మీ పొల సెన్సర్లు ఆన్‌లైన్‌లో ఉన్నాయి. మట్టిలో తేమ {moisture}%, ఉష్ణోగ్రత {temp}°C, ఆర్ద్రత {hum}% ఉంది. నేను ఎలా సహాయం చేయగలను?",
    chatDefault: "నేను మీ పొలాన్ని రియల్-టైమ్‌లో గమనిస్తున్నాను. మట్టిలో తేమ **{moisture}%**, ఉష్ణోగ్రత **{temp}°C**, ఆర్ద్రత **{hum}%**. మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
    chatSuggestionIrrigate: "ఎప్పుడు నీరు ఇవ్వాలి?",
    chatSuggestionFertilizer: "గోధుమకే ఎరువు సిఫార్సులు",
    chatSuggestionSellOnions: "ఇప్పుడు ఉల్లిపాయలు అమ్మాలా?",
    chatSuggestionPhZoneB: "జోన్ B లో pH స్థాయి",
    chatSuggestionWeather: "7 రోజుల వాతావరణ అంచనా",
    chatPlaceholder: "మీ పొల గురించి అడగండి...",
    chatResponseIrrigate: "మీ మట్టి తేమ {moisture}% ఉంది, ఇది 55%కంటే తక్కువ అయితే నీరు ఇవ్వాలి. షెడ్యూల్ చేసేముందు వాతావరణాన్ని చూసుకోండి.",
    chatResponseFertilizer: "గోధుమ కోసం ఇప్పుడు సమతుల NPK ఎరువును వర్తింపచేయండి. పంట టిల్లరింగ్‌లో ఉంటే నత్రజని సమృద్ధిగా ఉన్న ఎరువును ఉపయోగించండి.",
    chatResponseSellOnions: "ఉల్లిపాయల ధరలు బలంగా ఉన్నాయి. మీ పంట సిద్ధంగా ఉంటే, ఇప్పుడు అమ్మడం స్థానిక మండి ధరలను బాగా అందిస్తుంది.",
    chatResponsePh: "జోన్ B pH {ph} ఉంది. ఇది ఎక్కువ భాగం పంటలకోసం ఆరోగ్యకర పరిమితిలో ఉంది, కానీ ఇది 6.0కి దిగితే నిమ్మరసాన్ని కలపండి.",
    chatResponseWeather: "7 రోజుల సూచన ప్రధానంగా స్థిరంగా ఉంది, మధ్య వారంలో తేలికపాటి వర్షం ఉండవచ్చు. నీరు ఇవ్వడానికి ముందు ఆర్ద్రతను గమనించండి.",
  },
  ta: {
    chatWelcome: "மீண்டும் வரவுக்குறி, {name}! 🌿 உங்கள் பண்ணை சென்சார்கள் ஆன்லைனில் உள்ளன. மண்ணின் ஈரப்பதம் {moisture}%, வெப்பநிலை {temp}°C, ஈரப்பதம் {hum}% உள்ளது. நான் எப்படி உதவலாம்?",
    chatDefault: "நான் உங்கள் பண்ணையை நேரடியாக கண்காணிக்கிறேன். மண்ணின் ஈரப்பதம் **{moisture}%**, வெப்பநிலை **{temp}°C**, ஈரப்பதம் **{hum}%**. நீங்கள் என்ன அறிவதாக்க வேண்டும்?",
    chatSuggestionIrrigate: "நீர்ப்பாசனம் எப்போது செய்ய வேண்டும்?",
    chatSuggestionFertilizer: "கோதுமைக்கு உர பரிந்துரைகள்",
    chatSuggestionSellOnions: "இப்போது வெங்காயம் விற்கலாமா?",
    chatSuggestionPhZoneB: "பால் B இல் pH நிலை",
    chatSuggestionWeather: "7 நாள் வானிலை கணிப்பு",
    chatPlaceholder: "உங்கள் பண்ணை பற்றி கேளுங்கள்...",
    chatResponseIrrigate: "மண்ணின் ஈரப்பதம் {moisture}% உள்ளது, இது 55% கீழே என்றால் நீர் போடவும். திட்டமிடுவதற்கு முன்னர் வானிலை பாருங்கள்.",
    chatResponseFertilizer: "கோதுமைக்கு இப்போது சமநிலை NPK உரத்தை பயன்படுத்தவும். பயிர் டில்லரிங் நிலையில் இருந்தால் நைட்ரஜன் நிறைந்த உரத்தை பயன்படுத்தவும்.",
    chatResponseSellOnions: "வெங்காய விலை நல்லது. உங்கள் பயிர் தயார் என்றால், இப்போது விற்குவது நல்ல மண்டி விலையில் கிடைக்கலாம்.",
    chatResponsePh: "பால் B இல் pH {ph} உள்ளது. இது பெரும்பாலான பயிர்களுக்கு நல்ல வரம்பில் உள்ளது, ஆனால் இது 6.0 க்குக் கீழே இருந்தால் கறுகலையை சேர்க்கவும்.",
    chatResponseWeather: "7 நாள் முன்னறிவு பெரும்பாலும் நிலையானது, நடுவான வாரத்தில் சிறிய மழை இருக்கலாம். நீர் போடுவதற்கு முன் ஈரப்பதத்தை கவனிக்கவும்.",
  },
  bn: {
    chatWelcome: "আবার স্বাগতম, {name}! 🌿 আপনার খামারের সেন্সর অনলাইনে রয়েছে। মাটির আর্দ্রতা {moisture}%, তাপমাত্রা {temp}°C, আর্দ্রতা {hum}%। আমি কীভাবে সাহায্য করতে পারি?",
    chatDefault: "আমি আপনার খামারের ডেটা রিয়েল-টাইমে মনিটর করছি। মাটির আর্দ্রতা **{moisture}%**, তাপমাত্রা **{temp}°C**, আর্দ্রতা **{hum}%**। আপনি কী জানতে চান?",
    chatSuggestionIrrigate: "কখন সেচ দেব?",
    chatSuggestionFertilizer: "গমের জন্য সার পরামর্শ",
    chatSuggestionSellOnions: "এখন কি পিয়াজ বিক্রি করা উচিত?",
    chatSuggestionPhZoneB: "জোন B-এ pH স্তর",
    chatSuggestionWeather: "7 দিনের আবহাওয়া পূর্বাভাস",
    chatPlaceholder: "আপনার খামারের সম্পর্কে প্রশ্ন করুন...",
    chatResponseIrrigate: "আপনার মাটির আর্দ্রতা {moisture}%। এটি 55%-এর নীচে গেলে সেচ দেওয়া উচিত। পরিকল্পনার আগে আবহাওয়া দেখুন।",
    chatResponseFertilizer: "গমের জন্য এখন একটি সুষম NPK সার প্রয়োগ করুন। যদি ফসল টিলারিং পর্যায়ে থাকে তবে নাইট্রোজেন সমৃদ্ধ সার ব্যবহার করুন।",
    chatResponseSellOnions: "পিয়াজের দাম ভালো। আপনার ফসল প্রস্তুত হলে এখন বিক্রি করলে স্থানীয় মন্ডির ভালো দাম পাওয়া যেতে পারে।",
    chatResponsePh: "জোন B-এ pH {ph}। এটি বেশিরভাগ ফসলের জন্য স্বাস্থ্যকর সীমায় আছে, তবে এটি 6.0-এর নীচে হলে চুন যোগ করুন।",
    chatResponseWeather: "7 দিনের দৃষ্টিভঙ্গি সাধারণত স্থিতিশীল, সপ্তাহের মাঝামাঝি হালকা বৃষ্টি হতে পারে। সেচের আগে আর্দ্রতা পরীক্ষা করুন।",
  },
  kn: {
    chatWelcome: "ಮತ್ತೆ ಸ್ವಾಗತ, {name}! 🌿 ನಿಮ್ಮ ಬೆಳೆ ಸೆನ್ಸಾರ್‌ಗಳು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಇವೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ {moisture}%, ತಾಪಮಾನ {temp}°C, ಆರ್ದ್ರತೆ {hum}% ಇದೆ. ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    chatDefault: "ನಾನು ನಿಮ್ಮ ಬೆಳೆ ಡೇಟಾವನ್ನು ರಿಯಲ್-ಟೈಮ್‌ನಲ್ಲಿ ನೋಡುತ್ತಿದ್ದೇನೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ **{moisture}%**, ತಾಪಮಾನ **{temp}°C**, ಆರ್ದ್ರತೆ **{hum}%**. ನೀವು ಏನು ತಿಳಿದುಕೊಳ್ಳಬಯಸುತ್ತೀರಿ?",
    chatSuggestionIrrigate: "ನಾನು ನೀರು ಹಾಕಬೇಕಾದಾಗ ಯಾವಾಗ?",
    chatSuggestionFertilizer: "ಗೋಧಿಗೆ ರಸಗೊಬ್ಬರ ಶಿಫಾರಸುಗಳು",
    chatSuggestionSellOnions: "ಈಗ ಈರುಳ್ಳಿ ಮಾರಬೇಕು?",
    chatSuggestionPhZoneB: "ಜೋನ್ B ನಲ್ಲಿ pH ಮಟ್ಟ",
    chatSuggestionWeather: "7 ದಿನಗಳ ಹವಾಮಾನ ಊಹೆ",
    chatPlaceholder: "ನಿಮ್ಮ ಬೆಳೆ ಬಗ್ಗೆ ಕೇಳಿ...",
    chatResponseIrrigate: "ನಿಮ್ಮ ಮಣ್ಣಿನ ತೇವಾಂಶ {moisture}% ಇದೆ, ಅದು 55% ಕ್ಕೆ ಕಡಿಮೆಯಾಗಿದ್ದರೆ ನೀರಾವರಿ ಕೊಡುವುದು ಉತ್ತಮ. ವೇಳಾಪಟ್ಟಿಯನ್ನು ಮಾಡುವುದು ಮುಂಚೆ ಹವಾಮಾನ ಪರಿಶೀಲಿಸಿ.",
    chatResponseFertilizer: "ಗೋಧಿಗೆ ಈಗ ಸಮತೋಲನ NPK ರಸಗೊಬ್ಬರವನ್ನು ಅನ್ವಯಿಸಿ. ಬೆಳೆ ಟಿಲ್ಲರಿಂಗ್ ಹಂತದಲ್ಲಿದ್ದಲ್ಲಿ ನೈಟ್ರೋಜನ್ ಸಮೃದ್ಧ ರಸಗೊಬ್ಬರವನ್ನು ಬಳಸಿರಿ.",
    chatResponseSellOnions: "ಈಗ ಈರುಳ್ಳಿ ದರಗಳು ಬಲವಾಗಿವೆ. ನಿಮ್ಮ ಬೆಳೆ ಸಿದ್ದವಾಗಿದ್ದರೆ ಈಗ ಮಾರಲು ಸ್ಥಳೀಯ ಮಳಿಗೆ ದರಗಳನ್ನು ಉತ್ತಮವಾಗಿ ಪಡೆಯಬಹುದು.",
    chatResponsePh: "ಜೋನ್ B ನಲ್ಲಿ pH {ph} ಇದೆ. ಇದು ಹೆಚ್ಚು ಬ್ಯೆಳೆಯ ಕೃಷಿಗಳಿಗೆ ಆರೋಗ್ಯಕರ ಶ್ರೆಣಿಯಲ್ಲಿ ಇದೆ, ಆದರೆ ಅದು 6.0 ಕ್ಕಿಂತ ಕಡಿಮೆ ಇದ್ದರೆ ನಿಂಬೆಗೊಬ್ಬರವನ್ನು ಸೇರಿಸಿ.",
    chatResponseWeather: "7 ದಿನಗಳ ಮುನ್ಸೂಚನೆ ಮುಖ್ಯವಾಗಿ ಸ್ಥಿರವಾಗಿದೆ, ವಾರೆಯ ಮಧ್ಯದಲ್ಲಿ ಸೂಕ್ಷ್ಮ ಮಳೆ ಇರುವ ಸಾಧ್ಯತೆ ಇದೆ. ನೀರು ಹಾಕುವುದಕ್ಕೆ ಮೊದಲು ಆರ್ದ್ರತೆಯನ್ನು ಗಮನಿಸಿ.",
  },
};

// Initial sensor data
const initialSensorData = {
  soilMoisture: 62,
  temperature: 28,
  humidity: 74,
  soilPh: 6.8,
  nitrogen: 42,
  phosphorus: 19,
  potassium: 31,
};

const defaultCropSensorRange = {
  label: "General crop",
  soilMoisture: [50, 75],
  temperature: [18, 32],
  humidity: [45, 80],
  soilPh: [6.0, 7.5],
};

const cropSensorRanges = {
  wheat: { label: "Wheat", soilMoisture: [45, 70], temperature: [15, 28], humidity: [40, 70], soilPh: [6.0, 7.5] },
  rice: { label: "Rice", soilMoisture: [70, 95], temperature: [22, 34], humidity: [60, 90], soilPh: [5.5, 7.0] },
  paddy: { label: "Paddy", soilMoisture: [70, 95], temperature: [22, 34], humidity: [60, 90], soilPh: [5.5, 7.0] },
  maize: { label: "Maize", soilMoisture: [50, 75], temperature: [18, 32], humidity: [45, 75], soilPh: [5.8, 7.5] },
  corn: { label: "Corn", soilMoisture: [50, 75], temperature: [18, 32], humidity: [45, 75], soilPh: [5.8, 7.5] },
  soybean: { label: "Soybean", soilMoisture: [50, 75], temperature: [20, 32], humidity: [45, 80], soilPh: [6.0, 7.2] },
  cotton: { label: "Cotton", soilMoisture: [45, 70], temperature: [21, 35], humidity: [40, 75], soilPh: [6.0, 8.0] },
  sugarcane: { label: "Sugarcane", soilMoisture: [60, 85], temperature: [20, 35], humidity: [55, 85], soilPh: [6.0, 8.0] },
  onion: { label: "Onion", soilMoisture: [55, 75], temperature: [13, 30], humidity: [45, 70], soilPh: [6.0, 7.5] },
  tomato: { label: "Tomato", soilMoisture: [55, 80], temperature: [18, 30], humidity: [50, 80], soilPh: [6.0, 7.0] },
  potato: { label: "Potato", soilMoisture: [55, 80], temperature: [15, 25], humidity: [60, 85], soilPh: [5.5, 6.8] },
  chilli: { label: "Chilli", soilMoisture: [50, 75], temperature: [20, 32], humidity: [45, 75], soilPh: [6.0, 7.0] },
  pepper: { label: "Pepper", soilMoisture: [55, 80], temperature: [20, 32], humidity: [60, 85], soilPh: [5.5, 7.0] },
  brinjal: { label: "Brinjal", soilMoisture: [55, 80], temperature: [20, 32], humidity: [50, 80], soilPh: [5.5, 7.0] },
  eggplant: { label: "Eggplant", soilMoisture: [55, 80], temperature: [20, 32], humidity: [50, 80], soilPh: [5.5, 7.0] },
  cabbage: { label: "Cabbage", soilMoisture: [55, 80], temperature: [15, 25], humidity: [55, 85], soilPh: [6.0, 7.5] },
  cauliflower: { label: "Cauliflower", soilMoisture: [55, 80], temperature: [15, 25], humidity: [55, 85], soilPh: [6.0, 7.5] },
  okra: { label: "Okra", soilMoisture: [50, 75], temperature: [22, 35], humidity: [45, 80], soilPh: [6.0, 7.5] },
  cucumber: { label: "Cucumber", soilMoisture: [60, 85], temperature: [20, 32], humidity: [60, 90], soilPh: [5.8, 7.0] },
  groundnut: { label: "Groundnut", soilMoisture: [45, 70], temperature: [22, 32], humidity: [45, 75], soilPh: [6.0, 7.5] },
  peanut: { label: "Peanut", soilMoisture: [45, 70], temperature: [22, 32], humidity: [45, 75], soilPh: [6.0, 7.5] },
  mustard: { label: "Mustard", soilMoisture: [40, 65], temperature: [10, 28], humidity: [35, 70], soilPh: [6.0, 7.5] },
  chickpea: { label: "Chickpea", soilMoisture: [40, 65], temperature: [18, 30], humidity: [35, 70], soilPh: [6.0, 8.0] },
  gram: { label: "Gram", soilMoisture: [40, 65], temperature: [18, 30], humidity: [35, 70], soilPh: [6.0, 8.0] },
  pea: { label: "Pea", soilMoisture: [50, 75], temperature: [13, 24], humidity: [45, 75], soilPh: [6.0, 7.5] },
  lentil: { label: "Lentil", soilMoisture: [40, 65], temperature: [18, 30], humidity: [35, 70], soilPh: [6.0, 8.0] },
  sunflower: { label: "Sunflower", soilMoisture: [45, 70], temperature: [20, 32], humidity: [40, 75], soilPh: [6.0, 7.8] },
  sesame: { label: "Sesame", soilMoisture: [35, 60], temperature: [22, 35], humidity: [35, 70], soilPh: [5.5, 8.0] },
  sorghum: { label: "Sorghum", soilMoisture: [35, 65], temperature: [22, 35], humidity: [35, 70], soilPh: [5.5, 8.0] },
  jowar: { label: "Jowar", soilMoisture: [35, 65], temperature: [22, 35], humidity: [35, 70], soilPh: [5.5, 8.0] },
  millet: { label: "Millet", soilMoisture: [35, 65], temperature: [22, 35], humidity: [35, 70], soilPh: [5.5, 8.0] },
  bajra: { label: "Bajra", soilMoisture: [35, 65], temperature: [22, 35], humidity: [35, 70], soilPh: [5.5, 8.0] },
  turmeric: { label: "Turmeric", soilMoisture: [60, 85], temperature: [20, 35], humidity: [60, 90], soilPh: [5.5, 7.5] },
  ginger: { label: "Ginger", soilMoisture: [60, 85], temperature: [20, 32], humidity: [60, 90], soilPh: [5.5, 7.0] },
  garlic: { label: "Garlic", soilMoisture: [50, 75], temperature: [13, 28], humidity: [45, 70], soilPh: [6.0, 7.5] },
  carrot: { label: "Carrot", soilMoisture: [55, 80], temperature: [15, 25], humidity: [45, 75], soilPh: [6.0, 7.0] },
  radish: { label: "Radish", soilMoisture: [55, 80], temperature: [15, 28], humidity: [45, 75], soilPh: [6.0, 7.5] },
  spinach: { label: "Spinach", soilMoisture: [55, 80], temperature: [10, 25], humidity: [50, 80], soilPh: [6.0, 7.5] },
  lettuce: { label: "Lettuce", soilMoisture: [55, 80], temperature: [10, 24], humidity: [50, 80], soilPh: [6.0, 7.0] },
  watermelon: { label: "Watermelon", soilMoisture: [50, 75], temperature: [22, 35], humidity: [45, 75], soilPh: [6.0, 7.5] },
  muskmelon: { label: "Muskmelon", soilMoisture: [50, 75], temperature: [22, 35], humidity: [45, 75], soilPh: [6.0, 7.5] },
  banana: { label: "Banana", soilMoisture: [60, 85], temperature: [20, 35], humidity: [60, 90], soilPh: [5.5, 7.5] },
  mango: { label: "Mango", soilMoisture: [40, 70], temperature: [24, 38], humidity: [40, 75], soilPh: [5.5, 7.5] },
  grapes: { label: "Grapes", soilMoisture: [45, 70], temperature: [15, 32], humidity: [40, 70], soilPh: [6.0, 7.5] },
  apple: { label: "Apple", soilMoisture: [45, 70], temperature: [10, 28], humidity: [45, 75], soilPh: [5.8, 7.0] },
  citrus: { label: "Citrus", soilMoisture: [45, 75], temperature: [18, 35], humidity: [45, 80], soilPh: [5.5, 7.5] },
  orange: { label: "Orange", soilMoisture: [45, 75], temperature: [18, 35], humidity: [45, 80], soilPh: [5.5, 7.5] },
  lemon: { label: "Lemon", soilMoisture: [45, 75], temperature: [18, 35], humidity: [45, 80], soilPh: [5.5, 7.5] },
  papaya: { label: "Papaya", soilMoisture: [55, 80], temperature: [22, 35], humidity: [55, 85], soilPh: [6.0, 7.5] },
  guava: { label: "Guava", soilMoisture: [40, 70], temperature: [20, 35], humidity: [40, 75], soilPh: [5.0, 7.5] },
  vegetables: { label: "Vegetables", soilMoisture: [55, 80], temperature: [18, 32], humidity: [50, 80], soilPh: [6.0, 7.5] },
  pulses: { label: "Pulses", soilMoisture: [45, 70], temperature: [18, 32], humidity: [40, 75], soilPh: [6.0, 7.5] },
};

const alertSensorMeta = {
  soilMoisture: { label: "Soil moisture", unit: "%", icon: Droplets },
  temperature: { label: "Temperature", unit: "°C", icon: CloudSun },
  humidity: { label: "Humidity", unit: "%", icon: Radio },
  soilPh: { label: "Soil pH", unit: "", icon: Sprout },
};

const normalizeCropName = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCropSensorRange = (cropName = "") => {
  const normalized = normalizeCropName(cropName);
  if (!normalized || normalized === "fallow" || normalized === "none") return null;

  const parts = normalized.split(/\s|,|\/|&|\+/).filter(Boolean);
  const direct = cropSensorRanges[normalized] || parts.map((part) => cropSensorRanges[part]).find(Boolean);
  return direct || { ...defaultCropSensorRange, label: cropName || defaultCropSensorRange.label };
};

const formatRange = ([min, max], unit = "") => `${min}${unit} - ${max}${unit}`;

// Market prices by region
const marketPricesByRegion = {
  Maharashtra: {
    mandis: [
      { name: "Pune APMC", distance: 18, crops: { wheat: 2480, onion: 1850 } },
      { name: "Solapur Mandi", distance: 45, crops: { soybean: 4450, maize: 2300 } },
    ],
    prices: [
      { name: "Wheat", emoji: "🌾", price: 2480, change: 2.5, up: true },
      { name: "Soybean", emoji: "🫘", price: 4320, change: 1.8, up: false },
      { name: "Onion", emoji: "🧅", price: 1850, change: 5.1, up: true },
      { name: "Cotton", emoji: "☁️", price: 6200, change: 1.2, up: true },
      { name: "Sugarcane", emoji: "🌿", price: 3200, change: 0.8, up: true },
    ],
  },
  Karnataka: {
    mandis: [
      { name: "Bengaluru APMC", distance: 22, crops: { wheat: 2500, onion: 1900 } },
      { name: "Hubballi Mandi", distance: 65, crops: { soybean: 4380, maize: 2250 } },
    ],
    prices: [
      { name: "Wheat", emoji: "🌾", price: 2500, change: 2.1, up: true },
      { name: "Soybean", emoji: "🫘", price: 4380, change: 1.5, up: false },
      { name: "Onion", emoji: "🧅", price: 1900, change: 4.8, up: true },
      { name: "Coffee", emoji: "☕", price: 8500, change: 3.2, up: true },
      { name: "Coconut", emoji: "🥥", price: 1200, change: 2.1, up: false },
    ],
  },
  "Tamil Nadu": {
    mandis: [
      { name: "Chennai APMC", distance: 15, crops: { wheat: 2520, onion: 2100 } },
      { name: "Coimbatore Mandi", distance: 50, crops: { maize: 2280, rice: 3800 } },
    ],
    prices: [
      { name: "Rice", emoji: "🍚", price: 3800, change: 1.5, up: true },
      { name: "Onion", emoji: "🧅", price: 2100, change: 6.2, up: true },
      { name: "Turmeric", emoji: "🌼", price: 9500, change: 4.1, up: true },
      { name: "Chilli", emoji: "🌶️", price: 7200, change: 2.8, up: false },
      { name: "Groundnut", emoji: "🥜", price: 5100, change: 1.9, up: true },
    ],
  },
  Punjab: {
    mandis: [
      { name: "Ludhiana APMC", distance: 20, crops: { wheat: 2600, rice: 4000 } },
      { name: "Amritsar Mandi", distance: 35, crops: { maize: 2350, cotton: 6500 } },
    ],
    prices: [
      { name: "Wheat", emoji: "🌾", price: 2600, change: 3.2, up: true },
      { name: "Rice", emoji: "🍚", price: 4000, change: 2.8, up: true },
      { name: "Cotton", emoji: "☁️", price: 6500, change: 1.8, up: true },
      { name: "Maize", emoji: "🌽", price: 2350, change: 1.2, up: false },
      { name: "Mustard", emoji: "🌻", price: 5200, change: 2.5, up: true },
    ],
  },
  default: {
    mandis: [
      { name: "District APMC", distance: 25, crops: { wheat: 2480, onion: 1850 } },
      { name: "Regional Mandi", distance: 50, crops: { soybean: 4320, maize: 2210 } },
    ],
    prices: [
      { name: "Wheat", emoji: "🌾", price: 2480, change: 2.5, up: true },
      { name: "Soybean", emoji: "🫘", price: 4320, change: 1.8, up: false },
      { name: "Maize", emoji: "🌽", price: 2210, change: 3.2, up: true },
      { name: "Onion", emoji: "🧅", price: 1850, change: 5.1, up: true },
      { name: "Tomato", emoji: "🍅", price: 2600, change: 2.3, up: false },
    ],
  },
};

// Weather conditions based on temperature
const getWeatherCondition = (temp) => {
  if (temp < 15) return { icon: "🌤️", condition: "Cool", advice: "Frost protection recommended for sensitive crops." };
  if (temp < 25) return { icon: "⛅", condition: "Pleasant", advice: "Optimal conditions for most farming activities." };
  if (temp < 35) return { icon: "☀️", condition: "Warm", advice: "Ensure adequate irrigation. Schedule work for early morning." };
  return { icon: "🌡️", condition: "Hot", advice: "Avoid midday outdoor work. Increase irrigation frequency." };
};

// AI responses
const aiResponses = {
  irrigat: "Based on current soil moisture levels, I recommend **moderate irrigation** for the next 2 hours. Zone B needs more attention with lower moisture levels.",
  fertiliz: "For wheat crops, apply **Nitrogen-rich fertilizer** (120kg/ha) during the tillering stage. Current soil N levels are **Good** but P is **Low** - consider phosphate supplementation.",
  onion: "Onion prices are trending **up** in your region. Consider selling within the next **3-5 days** for optimal returns.",
  ph: "Your soil pH is within acceptable range. For optimal wheat growth, aim for **6.5-7.0**. Apply agricultural lime if pH drops below 6.0.",
  predict: "7-day forecast shows **favorable conditions** for irrigation. Expect possible rainfall which may reduce irrigation needs.",
  default: "I'm monitoring your farm data in real-time. Current soil moisture is **{moisture}%**, temperature **{temp}°C**, and humidity **{hum}%**. How can I assist you today?",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    name: "Farmer",
    email: "farmer@cropconnect.com",
    state: "Maharashtra",
    city: "Pune",
    landSize: "2.5",
    cropType: "Wheat, Soybean",
    farmingType: "Organic",
    zoneA: "Wheat",
    zoneB: "Vegetables",
    zoneC: "Fallow",
    sensors: "3",
    pumps: "2",
    sensorDeviceId: "sim-node-1",
    sensorSetupComplete: true,
    sensorSetupStatus: "ready",
  });
  const [language, setLanguage] = useState(
    () => localStorage.getItem("cropconnect-language") || "en"
  );
  const [theme, setTheme] = useState(
    () => localStorage.getItem("cropconnect-theme") || "light"
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({});
  const [userLoaded, setUserLoaded] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [sensorData, setSensorData] = useState(initialSensorData);
  const [sensorConnection, setSensorConnection] = useState({
    source: "simulated",
    deviceId: "sim-node-1",
    lastSeen: null,
    error: null,
  });
  const [pumps, setPumps] = useState({
    pump1: { on: true, runtime: 145, schedule: { on: "06:00", off: "08:00", flow: "12L/min" } },
    pump2: { on: false, runtime: 0, schedule: { on: "17:00", off: "19:00", flow: "10L/min" } },
  });
  const [apiLogs, setApiLogs] = useState([]);
  const [telemetryPacket, setTelemetryPacket] = useState({});
  const [weatherData, setWeatherData] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [marketData, setMarketData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const speechSentRef = useRef(false);
  const [pumpUpdating, setPumpUpdating] = useState({});
  const [scheduledTimers, setScheduledTimers] = useState({ pump1: [], pump2: [] });
  const [showTimerModal, setShowTimerModal] = useState({ show: false, pump: null });
  const [newTimer, setNewTimer] = useState({ hour: "", minute: "00", period: "AM", duration: "", days: [] });
  const [sensorSetupForm, setSensorSetupForm] = useState({
    deviceId: "sim-node-1",
    nodeCount: "3",
    apiKey: "dev-secret-key",
  });
  const [setupChecking, setSetupChecking] = useState(false);
  const [setupCheckResult, setSetupCheckResult] = useState(null);
  const logContainerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const timerControlledPumpsRef = useRef({});
  const pumpsRef = useRef(pumps);
  const persistedFarmLoadedRef = useRef(false);
  const snapshotSaveInFlightRef = useRef(false);
  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;
  const copy = { ...dashboardCopy.en, ...(dashboardCopy[language] || {}) };
  const t = (key) => copy[key] || dashboardCopy.en[key] || key;
  const chatText = { ...chatCopy.en, ...(chatCopy[language] || {}) };
  const ct = (key) => chatText[key] || chatCopy.en[key] || key;
  const cropZones = useMemo(
    () => [
      { id: "zoneA", name: "Zone A", crop: userData.zoneA, area: "1.2 acres" },
      { id: "zoneB", name: "Zone B", crop: userData.zoneB, area: "0.5 acres" },
      { id: "zoneC", name: "Zone C", crop: userData.zoneC, area: "0.8 acres" },
    ],
    [userData.zoneA, userData.zoneB, userData.zoneC]
  );
  const activeSensorAlerts = useMemo(() => {
    const alerts = [];

    cropZones.forEach((zone) => {
      const range = getCropSensorRange(zone.crop);
      if (!range) return;

      Object.entries(alertSensorMeta).forEach(([sensorKey, meta]) => {
        const value = Number(sensorData[sensorKey]);
        const safeRange = range[sensorKey];
        if (!Number.isFinite(value) || !safeRange) return;

        const [min, max] = safeRange;
        if (value >= min && value <= max) return;

        const direction = value < min ? "Low" : "High";
        const severity = value < min ? min - value : value - max;
        const tone = severity > (max - min) * 0.2 ? "critical" : "warning";

        alerts.push({
          id: `${zone.id}-${sensorKey}-${direction}`,
          icon: meta.icon,
          zone: zone.name,
          crop: range.label,
          sensorKey,
          sensorLabel: meta.label,
          title: `${direction} ${meta.label} - ${zone.name}`,
          body: `${range.label} needs ${meta.label.toLowerCase()} around ${formatRange(safeRange, meta.unit)}. Current reading is ${value}${meta.unit}.`,
          value,
          unit: meta.unit,
          min,
          max,
          tone,
          time: "Now",
        });
      });
    });

    return alerts;
  }, [cropZones, sensorData]);
  const cropHealthScore = useMemo(() => {
    const totalChecks = cropZones.reduce((count, zone) => {
      const range = getCropSensorRange(zone.crop);
      return range ? count + Object.keys(alertSensorMeta).length : count;
    }, 0);
    if (!totalChecks) return 100;
    return Math.max(0, Math.round(((totalChecks - activeSensorAlerts.length) / totalChecks) * 100));
  }, [activeSensorAlerts.length, cropZones]);

  const ownerPayload = useCallback(() => ({
    user_id: userData.id || null,
    email: userData.email || "",
  }), [userData.email, userData.id]);

  const ownerQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (userData.id) params.set("user_id", userData.id);
    else if (userData.email) params.set("email", userData.email);
    return params.toString();
  }, [userData.email, userData.id]);

  const savePumpStateToMysql = useCallback(async (pumpId, pump, apiResult = {}) => {
    if (!userData.id && !userData.email) return;
    await fetch(`${API}/farm/pump-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ownerPayload(),
        pump_id: pumpId,
        on: Boolean(pump.on),
        runtime: pump.runtime || 0,
        schedule: pump.schedule || {},
        sent_to_esp32: Boolean(apiResult.sent_to_esp32),
        message: apiResult.message || "",
      }),
    });
  }, [ownerPayload, userData.email, userData.id]);

  const saveTimersToMysql = useCallback(async (nextTimers) => {
    if (!userData.id && !userData.email) return;
    await fetch(`${API}/farm/timers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ownerPayload(), timers: nextTimers }),
    });
  }, [ownerPayload, userData.email, userData.id]);

  const saveDashboardSnapshot = useCallback(async () => {
    if ((!userData.id && !userData.email) || snapshotSaveInFlightRef.current) return;
    snapshotSaveInFlightRef.current = true;
    try {
      await fetch(`${API}/farm/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ownerPayload(),
          device_id: sensorConnection.deviceId || userData.sensorDeviceId || "sim-node-1",
          source: sensorConnection.source,
          sensor_data: sensorData,
          pump_data: pumps,
          timers: scheduledTimers,
          weather_data: weatherData,
          market_data: marketData,
          telemetry_packet: telemetryPacket,
        }),
      });
    } finally {
      snapshotSaveInFlightRef.current = false;
    }
  }, [marketData, ownerPayload, pumps, scheduledTimers, sensorConnection.deviceId, sensorConnection.source, sensorData, telemetryPacket, userData.email, userData.id, userData.sensorDeviceId, weatherData]);

  const getUserWeatherLocation = useCallback(() => {
    const place =
      userData.locationType === "village"
        ? userData.village || userData.city
        : userData.city || userData.village;
    return [place, userData.state].filter(Boolean).join(", ");
  }, [userData.city, userData.locationType, userData.state, userData.village]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("cropconnect-theme", theme);
  }, [isDark, theme]);

  useEffect(() => {
    pumpsRef.current = pumps;
  }, [pumps]);

  useEffect(() => {
    activeSensorAlerts.slice(0, 3).forEach((alert) => {
      toast.warning(alert.title, {
        description: alert.body,
        id: alert.id,
        duration: 5000,
      });
    });
  }, [activeSensorAlerts]);

  // Load user data from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("cropconnect-user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const normalizedUser = {
          sensors: "0",
          pumps: "0",
          sensorDeviceId: "sim-node-1",
          sensorSetupComplete: true,
          sensorSetupStatus: "ready",
          ...parsed,
        };
        setUserData(normalizedUser);
        setSensorSetupForm((prev) => ({
          ...prev,
          deviceId: normalizedUser.sensorDeviceId || prev.deviceId,
          nodeCount: normalizedUser.sensors || prev.nodeCount,
        }));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
    setUserLoaded(true);
  }, []);

  // Load market data based on user location
  useEffect(() => {
    const regionData = marketPricesByRegion[userData.state] || marketPricesByRegion.default;
    setMarketData(regionData);
  }, [userData.state]);

  // Load saved dashboard data from MySQL.
  useEffect(() => {
    const query = ownerQuery();
    if (!userLoaded || !query || persistedFarmLoadedRef.current) return;

    let cancelled = false;
    const loadPersistedFarmData = async () => {
      try {
        const [pumpResponse, timersResponse, chatResponse, snapshotResponse] = await Promise.all([
          fetch(`${API}/farm/pump-states?${query}`),
          fetch(`${API}/farm/timers?${query}`),
          fetch(`${API}/farm/chat-history?${query}&limit=50`),
          fetch(`${API}/farm/snapshot/latest?${query}`),
        ]);

        const [pumpPayload, timersPayload, chatPayload, snapshotPayload] = await Promise.all([
          pumpResponse.json().catch(() => ({})),
          timersResponse.json().catch(() => ({})),
          chatResponse.json().catch(() => ({})),
          snapshotResponse.json().catch(() => ({})),
        ]);
        if (cancelled) return;

        const snapshot = snapshotPayload.snapshot;
        if (snapshot?.sensor_data && Object.keys(snapshot.sensor_data).length) {
          setSensorData((prev) => ({ ...prev, ...snapshot.sensor_data }));
        }
        if (snapshot?.weather_data) setWeatherData(snapshot.weather_data);
        if (snapshot?.market_data) setMarketData(snapshot.market_data);

        if (Array.isArray(pumpPayload.items) && pumpPayload.items.length) {
          setPumps((prev) => {
            const next = { ...prev };
            pumpPayload.items.forEach((item) => {
              if (!next[item.pump_id]) return;
              next[item.pump_id] = {
                ...next[item.pump_id],
                on: Boolean(item.on),
                runtime: item.runtime || 0,
                schedule: Object.keys(item.schedule || {}).length ? item.schedule : next[item.pump_id].schedule,
              };
            });
            return next;
          });
        } else if (snapshot?.pump_data && Object.keys(snapshot.pump_data).length) {
          setPumps((prev) => ({ ...prev, ...snapshot.pump_data }));
        }

        if (timersPayload.timers && Object.keys(timersPayload.timers).length) {
          setScheduledTimers((prev) => ({ ...prev, ...timersPayload.timers }));
        } else if (snapshot?.timers && Object.keys(snapshot.timers).length) {
          setScheduledTimers((prev) => ({ ...prev, ...snapshot.timers }));
        }

        if (Array.isArray(chatPayload.items) && chatPayload.items.length) {
          setChatMessages(chatPayload.items);
        }

        persistedFarmLoadedRef.current = true;
      } catch (error) {
        persistedFarmLoadedRef.current = true;
        toast.error(error.message || "Could not load saved MySQL farm data");
      }
    };

    loadPersistedFarmData();
    return () => {
      cancelled = true;
    };
  }, [ownerQuery, userLoaded]);

  // Page configurations
  const pageConfig = {
    dashboard: { title: t("dashboard"), subtitle: t("dashboardSubtitle") },
    sensors: { title: t("sensors"), subtitle: t("sensorsSubtitle") },
    pump: { title: t("pump"), subtitle: t("pumpSubtitle") },
    weather: { title: `${t("weather")} - ${userData.locationType === "city" ? userData.city : userData.village}`, subtitle: `${userData.state} forecast and conditions` },
    notifications: { title: t("notifications"), subtitle: "Alerts, reminders and farm updates" },
    market: { title: t("market"), subtitle: `${userData.state} mandi rates and trends` },
    flow: { title: t("flow"), subtitle: "Data pipeline visualization" },
    ai: { title: t("ai"), subtitle: "Smart farming recommendations" },
    settings: { title: t("settings"), subtitle: "App preferences and contact" },
    profile: { title: t("profile"), subtitle: "Your farm information" },
  };

  // Random walk function for sensor simulation
  const randomWalk = useCallback((value, min, max, step) => {
    const change = (Math.random() - 0.5) * step * 2;
    return Math.max(min, Math.min(max, value + change));
  }, []);

  const applyBackendReadings = useCallback((payload) => {
    const readings = Array.isArray(payload?.readings) ? payload.readings : [];
    if (!readings.length) {
      if (payload && !Array.isArray(payload?.readings)) {
        console.warn("Unexpected sensor payload format:", payload);
      }
      return false;
    }

    const byType = readings.reduce((acc, reading) => {
      if (!reading || typeof reading.sensor_type !== "string") return acc;
      const value = Number(reading.value);
      if (!Number.isNaN(value)) {
        acc[reading.sensor_type] = value;
      }
      return acc;
    }, {});

    const updatedData = {
      soilMoisture: Number.isFinite(byType.soil_moisture) ? Math.round(byType.soil_moisture) : null,
      temperature: Number.isFinite(byType.temperature) ? Number(byType.temperature.toFixed(1)) : null,
      humidity: Number.isFinite(byType.humidity) ? Math.round(byType.humidity) : null,
      soilPh: Number.isFinite(byType.ph) ? Number(byType.ph.toFixed(1)) : null,
      nitrogen: Number.isFinite(byType.nitrogen) ? Number(byType.nitrogen.toFixed(1)) : null,
      phosphorus: Number.isFinite(byType.phosphorus) ? Number(byType.phosphorus.toFixed(1)) : null,
      potassium: Number.isFinite(byType.potassium) ? Number(byType.potassium.toFixed(1)) : null,
    };

    const hasValidValue = Object.values(updatedData).some((value) => value !== null);
    if (!hasValidValue) return false;

    setSensorData((prev) => ({
      soilMoisture: updatedData.soilMoisture ?? prev.soilMoisture,
      temperature: updatedData.temperature ?? prev.temperature,
      humidity: updatedData.humidity ?? prev.humidity,
      soilPh: updatedData.soilPh ?? prev.soilPh,
      nitrogen: updatedData.nitrogen ?? prev.nitrogen,
      phosphorus: updatedData.phosphorus ?? prev.phosphorus,
      potassium: updatedData.potassium ?? prev.potassium,
    }));

    setSensorConnection({
      source: "esp32",
      deviceId: payload.device_id || "sim-node-1",
      lastSeen: payload.recorded_at || new Date().toISOString(),
      error: null,
    });

    return true;
  }, []);

  // Read latest ESP32 data from the backend. If unavailable, simulation continues.
  useEffect(() => {
    let cancelled = false;
    const primaryDeviceId = userData.sensorDeviceId || "sim-node-1";
    const fallbackDeviceId = "sim-node-1";

    const loadLatestReadings = async () => {
      try {
        const deviceIds = primaryDeviceId === fallbackDeviceId ? [primaryDeviceId] : [primaryDeviceId, fallbackDeviceId];
        let payload = null;
        let usedDeviceId = primaryDeviceId;

        for (const deviceId of deviceIds) {
          const response = await fetch(`${API}/sensors/latest?device_id=${encodeURIComponent(deviceId)}`);
          if (!response.ok) throw new Error(`Backend returned ${response.status}`);
          const candidate = await response.json();
          if (cancelled) return;

          if (Array.isArray(candidate?.readings) && candidate.readings.length > 0) {
            payload = candidate;
            usedDeviceId = deviceId;
            break;
          }

          if (!payload) payload = candidate;
        }

        if (!payload) {
          throw new Error("No response from sensor backend");
        }

        const applied = applyBackendReadings(payload);
        if (!applied) {
          const errorMessage = payload?.message || "Waiting for ESP32 readings";
          const hint = usedDeviceId !== primaryDeviceId ? ` (fallback to ${usedDeviceId})` : "";
          console.warn("ESP32 sensor payload not applied:", payload);
          setSensorConnection((prev) => ({
            ...prev,
            source: "simulated",
            deviceId: usedDeviceId,
            error: errorMessage + hint,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load latest ESP32 readings:", error);
          setSensorConnection((prev) => ({
            ...prev,
            source: "simulated",
            error: error.message,
          }));
        }
      }
    };

    loadLatestReadings();
    const interval = setInterval(loadLatestReadings, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [applyBackendReadings, userData.sensorDeviceId]);

  // Update sensor data every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (sensorConnection.source === "esp32") return;
      setSensorData((prev) => ({
        soilMoisture: Math.round(randomWalk(prev.soilMoisture, 40, 85, 3)),
        temperature: Math.round(randomWalk(prev.temperature, 20, 38, 1)),
        humidity: Math.round(randomWalk(prev.humidity, 50, 90, 2)),
        soilPh: parseFloat(randomWalk(prev.soilPh, 5.5, 8.0, 0.1).toFixed(1)),
        nitrogen: parseFloat(randomWalk(prev.nitrogen, 20, 70, 2).toFixed(1)),
        phosphorus: parseFloat(randomWalk(prev.phosphorus, 8, 35, 1).toFixed(1)),
        potassium: parseFloat(randomWalk(prev.potassium, 15, 60, 2).toFixed(1)),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, [randomWalk, sensorConnection.source]);

  // Update telemetry packet when sensor data changes
  useEffect(() => {
    setTelemetryPacket({
      timestamp: new Date().toISOString(),
      node_id: sensorConnection.deviceId,
      source: sensorConnection.source,
      soil_moisture: sensorData.soilMoisture,
      temperature: sensorData.temperature,
      humidity: sensorData.humidity,
      ph_level: sensorData.soilPh,
      nitrogen: sensorData.nitrogen,
      phosphorus: sensorData.phosphorus,
      potassium: sensorData.potassium,
    });
  }, [sensorData, sensorConnection.deviceId, sensorConnection.source]);

  // Persist the current dashboard state periodically so refreshes restore from MySQL.
  useEffect(() => {
    if (!userLoaded || !persistedFarmLoadedRef.current) return undefined;
    const interval = setInterval(() => {
      saveDashboardSnapshot().catch(() => {});
    }, 30000);
    saveDashboardSnapshot().catch(() => {});
    return () => clearInterval(interval);
  }, [saveDashboardSnapshot, userLoaded]);

  // Load live internet weather data for the user's area.
  useEffect(() => {
    let cancelled = false;
    const locationName = getUserWeatherLocation();

    if (!locationName) {
      setWeatherData(null);
      setWeatherError("Please add your city or village and state in your profile.");
      return undefined;
    }

    const fallbackWeather = () => {
      const baseTemp = sensorData.temperature;
      return {
        temp: baseTemp,
        source: "Internet weather unavailable",
        humidity: sensorData.humidity,
        wind: Math.round(5 + Math.random() * 15),
        pressure: Math.round(1008 + Math.random() * 10),
        forecast: [
          { day: "Today", icon: "⛅", high: baseTemp + 2, low: baseTemp - 8 },
          { day: "Fri", icon: "🌤️", high: baseTemp + 3, low: baseTemp - 7 },
          { day: "Sat", icon: "🌧️", high: baseTemp - 1, low: baseTemp - 9 },
          { day: "Sun", icon: "⛅", high: baseTemp + 1, low: baseTemp - 8 },
          { day: "Mon", icon: "☀️", high: baseTemp + 4, low: baseTemp - 6 },
        ],
        rainfall: [
          { day: "Today", value: 15 },
          { day: "Fri", value: 25 },
          { day: "Sat", value: 45 },
          { day: "Sun", value: 35 },
          { day: "Mon", value: 20 },
        ],
      };
    };

    const loadWeather = async () => {
      try {
        setWeatherError("");
        const response = await fetch(`${API}/weather/forecast?location=${encodeURIComponent(locationName)}`);
        if (!response.ok) throw new Error(`Weather returned ${response.status}`);
        const payload = await response.json();
        if (!cancelled) setWeatherData(payload);
      } catch (error) {
        if (!cancelled) {
          setWeatherData(null);
          setWeatherError(error.message || "Could not load live weather");
        }
      }
    };

    loadWeather();
    const interval = setInterval(loadWeather, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [getUserWeatherLocation]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: 1,
          type: "bot",
          text: ct("chatWelcome")
            .replace("{name}", userData.name.split(" ")[0])
            .replace("{moisture}", sensorData.soilMoisture)
            .replace("{temp}", sensorData.temperature)
            .replace("{hum}", sensorData.humidity),
        },
      ]);
    }
  }, [chatMessages.length, ct, userData.name, sensorData.soilMoisture, sensorData.temperature, sensorData.humidity]);

  // API log simulation
  useEffect(() => {
    const endpoints = [
      { method: "GET", path: "/api/sensors/live", status: 200 },
      { method: "POST", path: "/api/telemetry/ingest", status: 201 },
      { method: "GET", path: "/api/weather/forecast", status: 200 },
      { method: "PUT", path: "/api/pump/state", status: 200 },
      { method: "GET", path: "/api/market/prices", status: 200 },
      { method: "GET", path: "/api/alerts/pending", status: 200 },
    ];
    let index = 0;
    const interval = setInterval(() => {
      const endpoint = endpoints[index % endpoints.length];
      const log = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        method: endpoint.method,
        path: endpoint.path,
        status: endpoint.status,
      };
      setApiLogs((prev) => {
        const updated = [...prev, log];
        return updated.slice(-12);
      });
      index++;
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll API log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [apiLogs]);

  const getTimerWindow = useCallback((timer) => {
    const [hours, minutes] = timer.startTime.split(":").map(Number);
    return {
      startMinute: hours * 60 + minutes,
      duration: Number(timer.duration),
    };
  }, []);

  const isTimerActiveNow = useCallback((timer, now) => {
    const { startMinute, duration } = getTimerWindow(timer);
    const currentDay = now.getDay();
    const currentMinute = now.getHours() * 60 + now.getMinutes();

    return timer.days.some((day) => {
      const offsetDays = (currentDay - day + 7) % 7;
      const minutesSinceTimerStart = offsetDays * 1440 + currentMinute - startMinute;
      return minutesSinceTimerStart >= 0 && minutesSinceTimerStart < duration;
    });
  }, [getTimerWindow]);

  useEffect(() => {
    const checkTimers = () => {
      const now = new Date();

      Object.entries(scheduledTimers).forEach(([pumpId, timers]) => {
        const activeTimer = timers.find((timer) => isTimerActiveNow(timer, now));
        const controlledTimerId = timerControlledPumpsRef.current[pumpId];
        const pumpName = pumpId === "pump1" ? "Pump 1" : "Pump 2";
        const currentPump = pumpsRef.current[pumpId];

        if (activeTimer && !controlledTimerId && !currentPump.on) {
          timerControlledPumpsRef.current[pumpId] = activeTimer.id;
          updatePumpState(pumpId, true).then((data) => {
            const nextPump = { ...pumpsRef.current[pumpId], on: true, runtime: 0 };
            savePumpStateToMysql(pumpId, nextPump, data).catch(() => {});
          }).catch((error) => {
            toast.error(error.message || "Could not reach pump controller");
          });
          setPumps((prev) => ({
            ...prev,
            [pumpId]: {
              ...prev[pumpId],
              on: true,
              runtime: 0,
            },
          }));
          toast.success(`${pumpName} started by scheduled timer`);
          return;
        }

        if (!activeTimer && controlledTimerId) {
          delete timerControlledPumpsRef.current[pumpId];
          if (!currentPump.on) return;
          updatePumpState(pumpId, false).then((data) => {
            const nextPump = { ...pumpsRef.current[pumpId], on: false };
            savePumpStateToMysql(pumpId, nextPump, data).catch(() => {});
          }).catch((error) => {
            toast.error(error.message || "Could not reach pump controller");
          });
          setPumps((prev) => {
            if (!prev[pumpId].on) return prev;
            return {
              ...prev,
              [pumpId]: {
                ...prev[pumpId],
                on: false,
              },
            };
          });
          toast.success(`${pumpName} stopped after scheduled timer`);
        }
      });
    };

    checkTimers();
    const interval = setInterval(checkTimers, 1000);
    return () => clearInterval(interval);
  }, [scheduledTimers, isTimerActiveNow, savePumpStateToMysql]);

  // Track pump runtime while pumps are running.
  useEffect(() => {
    const interval = setInterval(() => {
      setPumps((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([pumpId, pump]) => [
            pumpId,
            pump.on ? { ...pump, runtime: pump.runtime + 1 } : pump,
          ])
        )
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const updatePumpState = async (pumpId, nextOn) => {
    const response = await fetch(`${API}/pump/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pump_id: pumpId, on: nextOn }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Could not update pump state");
    }

    return data;
  };

  const togglePump = async (pumpId) => {
    const nextOn = !pumpsRef.current[pumpId].on;
    const pumpName = pumpId === "pump1" ? "Pump 1" : "Pump 2";

    setPumpUpdating((prev) => ({ ...prev, [pumpId]: true }));

    try {
      const data = await updatePumpState(pumpId, nextOn);

      if (timerControlledPumpsRef.current[pumpId]) {
        delete timerControlledPumpsRef.current[pumpId];
      }

      let persistedPump = null;
      setPumps((prev) => ({
        ...prev,
        [pumpId]: persistedPump = {
          ...prev[pumpId],
          on: nextOn,
          runtime: nextOn ? 0 : prev[pumpId].runtime,
        },
      }));
      if (persistedPump) {
        savePumpStateToMysql(pumpId, persistedPump, data).catch(() => {});
      }

      const stateText = nextOn ? "ON" : "OFF";
      if (data.sent_to_esp32) {
        toast.success(`${pumpName} turned ${stateText} through ESP32`);
      } else {
        toast.info(data.message || `${pumpName} turned ${stateText}`);
      }
    } catch (error) {
      toast.error(error.message || "Could not reach pump controller");
    } finally {
      setPumpUpdating((prev) => ({ ...prev, [pumpId]: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cropconnect-user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const sensorIngestUrl = `${API.replace(/\/api$/, "")}/api/telemetry/ingest`;
  const sensorDeviceId = sensorSetupForm.deviceId.trim() || userData.sensorDeviceId || "sim-node-1";

  const copyToClipboard = async (text, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const saveUserToMysql = async (updates) => {
    if (!userData.id && !userData.email) return null;

    const response = await fetch(`${API}/auth/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userData.id,
        email: userData.email,
        ...updates,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.detail || "Could not save data in MySQL");
    }

    return payload.user;
  };

  const saveSensorSetup = async (status = "ready") => {
    const updatedUser = {
      ...userData,
      sensorDeviceId,
      sensors: sensorSetupForm.nodeCount || "1",
      sensorSetupComplete: true,
      sensorSetupStatus: status,
      sensorSetupCompletedAt: new Date().toISOString(),
    };
    setUserData(updatedUser);
    localStorage.setItem("cropconnect-user", JSON.stringify(updatedUser));
    setSensorConnection((prev) => ({
      ...prev,
      deviceId: sensorDeviceId,
      source: status === "connected" ? "esp32" : "simulated",
      error: status === "connected" ? null : "Waiting for first ESP32 reading",
    }));

    try {
      const mysqlUser = await saveUserToMysql({
        sensor_device_id: sensorDeviceId,
        sensors: sensorSetupForm.nodeCount || "1",
        sensor_setup_complete: true,
        sensor_setup_status: status,
      });
      if (mysqlUser) {
        const mergedUser = { ...updatedUser, ...mysqlUser };
        setUserData(mergedUser);
        localStorage.setItem("cropconnect-user", JSON.stringify(mergedUser));
      }
      toast.success(status === "connected" ? "Sensor node connected" : "Sensor setup saved in MySQL");
    } catch (error) {
      toast.error(error.message || "Saved locally, but MySQL update failed");
    }
  };

  const testSensorConnection = async () => {
    setSetupChecking(true);
    setSetupCheckResult(null);
    try {
      const response = await fetch(`${API}/sensors/latest?device_id=${encodeURIComponent(sensorDeviceId)}`);
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const payload = await response.json();
      const hasReadings = applyBackendReadings(payload);
      if (hasReadings) {
        setSetupCheckResult({ type: "success", text: "Live sensor readings found for this device ID." });
        await saveSensorSetup("connected");
      } else {
        setSetupCheckResult({
          type: "waiting",
          text: "Backend is reachable, but this device has not sent readings yet. Flash the ESP32 code with this device ID, then test again.",
        });
      }
    } catch (error) {
      setSetupCheckResult({
        type: "error",
        text: `Could not reach the sensor API: ${error.message}`,
      });
    } finally {
      setSetupChecking(false);
    }
  };

  const buildLocalAiResponse = (messageText, responseKeyOverride = null) => {
    const aiResponses = {
      irrigate: ct("chatResponseIrrigate"),
      fertilizer: ct("chatResponseFertilizer"),
      sellOnions: ct("chatResponseSellOnions"),
      ph: ct("chatResponsePh"),
      weather: ct("chatResponseWeather"),
      default: ct("chatDefault"),
    };

    let responseKey = responseKeyOverride || "default";
    const input = messageText.toLowerCase();

    if (!responseKeyOverride) {
      if (input.includes("irrigate") || input.includes("सिंचाई") || input.includes("पानी") || input.includes("water") || input.includes("నీరు") || input.includes("ನೀರು") || input.includes("நீர்") || input.includes("সেচ")) {
        responseKey = "irrigate";
      } else if (input.includes("fertilizer") || input.includes("उर्वरक") || input.includes("खाद") || input.includes("खत") || input.includes("ఎరువు") || input.includes("உர") || input.includes("সার") || input.includes("ಗೊಬ್ಬರ") ) {
        responseKey = "fertilizer";
      } else if (input.includes("onion") || input.includes("प्याज") || input.includes("कांदा") || input.includes("ಈರುಳ್ಳಿ") || input.includes("ఉల్లిపాయ") || input.includes("வெங்காயம்") || input.includes("পিঁয়াজ")) {
        responseKey = "sellOnions";
      } else if (input.includes("ph")) {
        responseKey = "ph";
      } else if (input.includes("weather") || input.includes("मौसम") || input.includes("हवामान") || input.includes("ವಾತಾವರಣ") || input.includes("వాతావరణ") || input.includes("வானிலை") || input.includes("আবহাওয়া")) {
        responseKey = "weather";
      }
    }

    return (aiResponses[responseKey] || aiResponses.default)
      .replace("{moisture}", sensorData.soilMoisture)
      .replace("{temp}", sensorData.temperature)
      .replace("{hum}", sensorData.humidity)
      .replace("{ph}", sensorData.soilPh);
  };

  // Language detection function
  const detectLanguage = (text) => {
    if (!text || text.trim().length === 0) return language;

    const devanagari = /[\u0900-\u097F]/;
    const marathiKeywords = /(आहे|करू|मला|तुम्हाला|माझे|काय|कुठे|पाणी|शेत|तुमचा|माझ्या)/u;
    const hindiKeywords = /(है|करो|मुझे|आपको|क्या|कहाँ|पानी|खेती|नहीं|तुम)/u;

    if (devanagari.test(text)) {
      if (marathiKeywords.test(text) && !hindiKeywords.test(text)) return 'mr';
      return 'hi';
    }
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    return 'en';
  };
  
  // Get speech recognition language code
  const getSpeechLangCode = (langCode) => {
    const langMap = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN',
      'te': 'te-IN',
      'ta': 'ta-IN',
      'kn': 'kn-IN',
      'bn': 'bn-IN',
    };
    return langMap[langCode] || 'en-US';
  };

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getSpeechLangCode(language);

      recognition.onstart = () => {
        setIsListening(true);
        speechSentRef.current = false;
        const selectedLangName = languages.find(l => l.code === language)?.name || language;
        toast.info(`Listening... Speak your question in ${selectedLangName}`);
      };

      recognition.onresult = (event) => {
        if (speechSentRef.current) return;
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        
        const detectedLang = detectLanguage(transcript);
        const detectedLangName = languages.find(l => l.code === detectedLang)?.name || detectedLang;
        const selectedLangName = languages.find(l => l.code === language)?.name || language;
        if (detectedLang !== language) {
          toast.info(`Detected ${detectedLangName}; answering in ${selectedLangName}.`);
        } else {
          toast.success(`${detectedLangName} detected! Sending response in ${selectedLangName}...`);
        }
        
        speechSentRef.current = true;
        setTimeout(() => handleSendMessage(transcript, null, detectedLang), 500);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          toast.error("No speech detected. Please try again.");
        } else if (event.error === 'network') {
          toast.error("Network error. Please check your connection.");
        } else {
          toast.error(`Speech recognition failed: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
    }
  }, [language]);

  const startListening = () => {
    if (speechRecognition && !isListening) {
      try {
        speechRecognition.lang = getSpeechLangCode(language);
        speechRecognition.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast.error("Could not start microphone. Please check permissions.");
      }
    } else if (!speechRecognition) {
      toast.error("Speech recognition not supported in your browser. Try Chrome, Edge, or Safari.");
    }
  };

  const stopListening = () => {
    if (speechRecognition && isListening) {
      speechRecognition.stop();
    }
  };

  const handleSendMessage = async (messageOverride, responseKeyOverride = null, detectedLanguage = null) => {
    const messageText = (messageOverride ?? chatInput).trim();
    if (!messageText) return;
    const inputLanguage = detectedLanguage || detectLanguage(messageText);

    const userMessage = { id: Date.now(), type: "user", text: messageText };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setShowSuggestions(false);
    setIsTyping(true);

    try {
      const response = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ownerPayload(),
          message: messageText,
          language,
          input_language: inputLanguage,
          sensor_data: sensorData,
          market_data: marketData || {},
          weather_data: weatherData || {},
          location: `${userData.locationType === "city" ? userData.city : userData.village || userData.city}, ${userData.state}`,
          history: chatMessages.slice(-4).map((msg) => ({
            type: String(msg.type || ""),
            text: humanizeApiValue(msg.text),
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(humanizeApiValue(payload.detail, `AI returned ${response.status}`));
      const responseText = humanizeApiValue(
        payload.reply,
        buildLocalAiResponse(messageText, responseKeyOverride)
      );
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: responseText,
          relatedToPlantOrSoil: payload.related_to_plant_or_soil,
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: error.message || buildLocalAiResponse(messageText, responseKeyOverride),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion, suggestionKey) => {
    handleSendMessage(suggestion, suggestionKey);
  };

  const getTimerStartTime = (timerInput) => {
    if (!timerInput.hour || !timerInput.minute || !timerInput.period) return "";
    const hour12 = Number(timerInput.hour);
    const minute = Number(timerInput.minute);
    if (!hour12 || Number.isNaN(minute)) return "";

    const hour24 = timerInput.period === "PM"
      ? (hour12 === 12 ? 12 : hour12 + 12)
      : (hour12 === 12 ? 0 : hour12);

    return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const formatTimerStartTime = (startTime) => {
    const [hourText, minuteText] = startTime.split(":");
    const hour24 = Number(hourText);
    if (Number.isNaN(hour24)) return startTime;
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minuteText} ${period}`;
  };

  const resetTimerForm = () => {
    setNewTimer({ hour: "", minute: "00", period: "AM", duration: "", days: [] });
  };

  const getDefaultTimerForm = () => {
    const now = new Date();
    const roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;
    const defaultDate = new Date(now);
    defaultDate.setMinutes(roundedMinutes === 60 ? 0 : roundedMinutes, 0, 0);
    if (roundedMinutes === 60) defaultDate.setHours(defaultDate.getHours() + 1);
    const hour24 = defaultDate.getHours();
    return {
      hour: String(hour24 % 12 || 12),
      minute: String(defaultDate.getMinutes()).padStart(2, "0"),
      period: hour24 >= 12 ? "PM" : "AM",
      duration: "",
      days: [],
    };
  };

  const openTimerModal = (pumpId) => {
    setNewTimer(getDefaultTimerForm());
    setShowTimerModal({ show: true, pump: pumpId });
  };

  const closeTimerModal = () => {
    setShowTimerModal({ show: false, pump: null });
    resetTimerForm();
  };

  const handleAddTimer = () => {
    const startTime = getTimerStartTime(newTimer);
    const duration = Number(newTimer.duration);

    if (!showTimerModal.pump || !startTime || !duration) {
      toast.error("Please fill in all fields");
      return;
    }

    if (duration < 1 || duration > 480) {
      toast.error("Timer duration must be between 1 and 480 minutes");
      return;
    }

    const timer = {
      id: Date.now(),
      startTime,
      duration,
      days: newTimer.days.length > 0 ? newTimer.days : [0, 1, 2, 3, 4, 5, 6],
    };
    const nextTimers = {
      ...scheduledTimers,
      [showTimerModal.pump]: [
        ...scheduledTimers[showTimerModal.pump],
        timer,
      ],
    };
    setScheduledTimers(nextTimers);
    saveTimersToMysql(nextTimers).catch(() => {});

    closeTimerModal();
    toast.success("Timer scheduled successfully!");
  };

  const removeTimer = (pumpId, timerId) => {
    const nextTimers = {
      ...scheduledTimers,
      [pumpId]: scheduledTimers[pumpId].filter((t) => t.id !== timerId),
    };
    setScheduledTimers(nextTimers);
    saveTimersToMysql(nextTimers).catch(() => {});
    toast.success("Timer removed");
  };

  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { id: "sensors", icon: Radio, label: t("sensors"), badge: t("live") },
    { id: "pump", icon: Droplets, label: t("pump") },
    { id: "weather", icon: CloudSun, label: t("weather") },
    { id: "notifications", icon: Bell, label: t("notifications"), badge: activeSensorAlerts.length ? String(activeSensorAlerts.length) : null },
    { id: "market", icon: BarChart3, label: t("market") },
    { id: "flow", icon: Zap, label: t("flow") },
    { id: "ai", icon: Brain, label: t("ai"), badge: "New" },
    { id: "settings", icon: Settings, label: t("settings") },
    { id: "profile", icon: User, label: t("profile") },
  ];

  const suggestionChips = [
    "chatSuggestionIrrigate",
    "chatSuggestionFertilizer",
    "chatSuggestionSellOnions",
    "chatSuggestionPhZoneB",
    "chatSuggestionWeather",
  ];

  // Mini bar chart component
  const MiniBarChart = ({ color, data = 12 }) => {
    const bars = Array.from({ length: data }, () => Math.random() * 100);
    return (
      <div className="flex items-end gap-[2px] h-8">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${Math.max(10, h)}%`,
              background: color,
              opacity: 0.3 + (i / bars.length) * 0.7,
            }}
          />
        ))}
      </div>
    );
  };

  // Line chart component
  const LineChart = ({ data, color, height = 120 }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - ((v - min) / range) * 80 - 10,
    }));
    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
      <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#gradient-${color})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  };

  // Semicircle gauge component
  const SemicircleGauge = ({ value, max = 100, size = 140 }) => {
    const radius = size / 2 - 8;
    const circumference = Math.PI * radius;
    const offset = circumference - (value / max) * circumference;

    return (
      <div className="relative inline-block" style={{ width: size, height: size / 2 }}>
        <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`}>
          <defs>
            <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.red} />
              <stop offset="50%" stopColor={colors.gold} />
              <stop offset="100%" stopColor={colors.greenLight} />
            </linearGradient>
          </defs>
          <path
            d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
            fill="none"
            stroke={colors.creamDark}
            strokeWidth="8"
          />
          <path
            d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
          <span className="text-2xl font-mono font-bold" style={{ color: colors.textDark }}>{value}</span>
          <span className="text-xs" style={{ color: colors.textLight }}>/{max}</span>
        </div>
      </div>
    );
  };

  // Status chip component
  const StatusChip = ({ status }) => {
    const styles = {
      OK: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
      WARN: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
      CRIT: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
    };
    const s = styles[status] || styles.OK;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${s.bg} ${s.text} ${s.border}`}>
        {status}
      </span>
    );
  };

  // Metric card component
  const MetricCard = ({ icon: Icon, title, value, unit, color, trend, trendValue, progress }) => {
    const colorStyles = {
      green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-600", fill: colors.greenLight },
      orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", fill: colors.terracotta },
      blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", fill: colors.blue },
      gold: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", fill: colors.gold },
    };
    const style = colorStyles[color] || colorStyles.green;

    return (
      <div className={`relative p-4 rounded-xl bg-white border ${style.border} shadow-sm overflow-hidden`}>
        <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-8" style={{ background: style.fill }} />
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${style.bg}`}>
            <Icon className="w-5 h-5" style={{ color: style.fill }} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-sm" style={{ color: colors.textLight }}>{title}</p>
          <p className="text-2xl font-mono font-bold mt-1" style={{ color: colors.textDark }}>
            {value}
            <span className="text-sm font-normal ml-1" style={{ color: colors.textLight }}>{unit}</span>
          </p>
        </div>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: style.fill }} />
          </div>
        )}
      </div>
    );
  };

  // Sensor card component
  const SensorCard = ({ icon: Icon, title, value, unit, color, min, max, barValue }) => {
    const colorStyles = {
      green: colors.greenLight,
      orange: colors.terracotta,
      blue: colors.blue,
      gold: colors.gold,
    };
    const fill = colorStyles[color] || colors.greenLight;

    return (
      <div className="p-4 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg" style={{ background: `${fill}20` }}>
            <Icon className="w-4 h-4" style={{ color: fill }} />
          </div>
          <span className="text-sm font-medium" style={{ color: colors.textDark }}>{title}</span>
        </div>
        <p className="text-3xl font-mono font-bold" style={{ color: colors.textDark }}>
          {value}
          <span className="text-base font-normal ml-1" style={{ color: colors.textLight }}>{unit}</span>
        </p>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: colors.textLight }}>
            <span>{min}</span>
            <span>{max}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barValue}%`, background: `linear-gradient(90deg, ${fill}, ${fill}80)` }} />
          </div>
        </div>
        <div className="mt-3">
          <MiniBarChart color={fill} />
        </div>
      </div>
    );
  };

  // Pump card component
  const PumpCard = ({ id, name, zone, pump }) => {
    return (
      <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: colors.textDark }}>{name}</h3>
            <p className="text-sm" style={{ color: colors.textLight }}>{zone}</p>
          </div>
          <button
            onClick={() => togglePump(id)}
            disabled={pumpUpdating[id]}
            className={`relative w-12 h-6 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${pump.on ? "bg-green-500" : "bg-gray-300"}`}
            aria-label={`Turn ${name} ${pump.on ? "off" : "on"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${pump.on ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${pump.on ? "bg-green-50 animate-pulse" : "bg-gray-100"}`} style={pump.on ? { boxShadow: `0 0 20px ${colors.greenLight}40` } : {}}>
            {pump.on ? (
              <Droplets className="w-6 h-6 animate-spin" style={{ color: colors.greenLight, animationDuration: "3s" }} />
            ) : (
              <span className="text-2xl">⏸️</span>
            )}
          </div>
          <div>
            <p className="text-sm" style={{ color: colors.textLight }}>{t("status")}</p>
            <p className="font-medium" style={{ color: colors.textDark }}>{pump.on ? t("running") : t("stopped")}</p>
            {pump.on && <p className="text-sm" style={{ color: colors.greenLight }}>{t("runtime")}: {formatTime(pump.runtime)}</p>}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 text-xs rounded-md bg-gray-100" style={{ color: colors.textMid }}>ON: {pump.schedule.on}</span>
          <span className="px-2 py-1 text-xs rounded-md bg-gray-100" style={{ color: colors.textMid }}>OFF: {pump.schedule.off}</span>
          <span className="px-2 py-1 text-xs rounded-md bg-gray-100" style={{ color: colors.textMid }}>{pump.schedule.flow}</span>
        </div>

        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: pump.on ? "65%" : "0%", background: `linear-gradient(90deg, ${colors.greenLight}, ${colors.greenAccent})` }} />
        </div>

        <p className="text-xs text-center" style={{ color: colors.textLight }}>{t("autoMode")}</p>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium" style={{ color: colors.textDark }}>{t("scheduledTimers")}</p>
            <button onClick={() => openTimerModal(id)} className="text-xs px-2 py-1 rounded-md bg-green-50 hover:bg-green-100 transition-colors" style={{ color: colors.greenLight }}>
              {t("addTimer")}
            </button>
          </div>
          <div className="space-y-1">
            {scheduledTimers[id]?.map((timer) => (
              <div key={timer.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-gray-50">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" style={{ color: colors.textLight }} />
                  <span className="text-xs font-mono" style={{ color: colors.textDark }}>{formatTimerStartTime(timer.startTime)} ({timer.duration}min)</span>
                </div>
                <button onClick={() => removeTimer(id, timer.id)} className="text-gray-400 hover:text-red-500">
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            ))}
            {(!scheduledTimers[id] || scheduledTimers[id].length === 0) && (
              <p className="text-xs text-center py-2" style={{ color: colors.textLight }}>{t("noTimers")}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Timer Modal
  const TimerModal = () => {
    if (!showTimerModal.show) return null;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: colors.textDark }}>
              {t("scheduleTimer")} - {showTimerModal.pump === "pump1" ? "Pump 1" : "Pump 2"}
            </h3>
            <button onClick={closeTimerModal}>
              <XCircle className="w-5 h-5" style={{ color: colors.textLight }} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: colors.textDark }}>{t("startTime")}</label>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <select
                  value={newTimer.hour}
                  onChange={(e) => setNewTimer((prev) => ({ ...prev, hour: e.target.value }))}
                  className="h-11 rounded-md border px-3 text-sm"
                  style={{ borderColor: colors.creamDark, color: colors.textDark, background: isDark ? "#0f1d16" : "white" }}
                >
                  <option value="">Hour</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((hour) => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  value={newTimer.minute}
                  onChange={(e) => setNewTimer((prev) => ({ ...prev, minute: e.target.value }))}
                  className="h-11 rounded-md border px-3 text-sm"
                  style={{ borderColor: colors.creamDark, color: colors.textDark, background: isDark ? "#0f1d16" : "white" }}
                >
                  {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0")).map((minute) => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
                <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: colors.creamDark }}>
                  {["AM", "PM"].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setNewTimer((prev) => ({ ...prev, period }))}
                      className={`px-3 text-sm font-medium ${newTimer.period === period ? "bg-green-600 text-white" : ""}`}
                      style={newTimer.period === period ? {} : { color: colors.textMid, background: isDark ? "#0f1d16" : "white" }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block" style={{ color: colors.textDark }}>{t("duration")}</label>
              <Input type="number" min="1" max="480" placeholder="e.g., 30" value={newTimer.duration} onChange={(e) => setNewTimer((prev) => ({ ...prev, duration: e.target.value }))} className="w-full" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: colors.textDark }}>{t("days")}</label>
              <div className="flex gap-2 flex-wrap">
                {days.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setNewTimer((prev) => ({
                        ...prev,
                        days: prev.days.includes(idx) ? prev.days.filter((d) => d !== idx) : [...prev.days, idx],
                      }));
                    }}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${newTimer.days.includes(idx) ? "bg-green-500 text-white border-green-500" : "bg-white border-gray-200 hover:border-gray-300"}`}
                    style={newTimer.days.includes(idx) ? {} : { color: colors.textMid }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={closeTimerModal} className="flex-1">{t("cancel")}</Button>
            <Button onClick={handleAddTimer} className="flex-1 bg-green-600 hover:bg-green-700">{t("saveTimer")}</Button>
          </div>
        </div>
      </div>
    );
  };

  // Field Map Component
  const FieldMap = () => {
    const zoneHasAlert = (zoneName) => activeSensorAlerts.some((alert) => alert.zone === zoneName);

    return (
      <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: colors.textDark }}>Field Map</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600">{userData.landSize} acres</span>
        </div>
        <div className="relative rounded-xl overflow-hidden" style={{ height: 280, background: `linear-gradient(135deg, #1a472a, #2d5a3d)` }}>
          {/* Simulated field map with zones */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-2 p-4 w-full h-full">
              {/* Zone A */}
              <div className="relative rounded-lg overflow-hidden" style={{ background: "#4a8a5a", gridColumn: "span 2" }}>
                <div className="absolute top-2 left-2 text-white text-xs font-medium">Zone A - {userData.zoneA || "Crop"}</div>
                <div className="absolute bottom-2 left-2 text-white/70 text-xs">1.2 acres</div>
                <div className="absolute top-2 right-2">
                  {zoneHasAlert("Zone A") ? <AlertTriangle className="w-4 h-4 text-amber-300" /> : <Droplets className="w-4 h-4 text-green-200" />}
                </div>
                {/* Simulated crop rows */}
                <div className="absolute inset-0 flex flex-col justify-around p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-0.5 bg-green-300/30 rounded-full" style={{ width: `${80 + Math.random() * 20}%` }} />
                  ))}
                </div>
              </div>
              {/* Zone B - Vegetables */}
              <div className="relative rounded-lg overflow-hidden" style={{ background: "#3a7a4a" }}>
                <div className="absolute top-2 left-2 text-white text-xs font-medium">Zone B - {userData.zoneB || "Crop"}</div>
                <div className="absolute bottom-2 left-2 text-white/70 text-xs">0.5 acres</div>
                <div className="absolute top-2 right-2">
                  {zoneHasAlert("Zone B") ? <AlertTriangle className="w-4 h-4 text-amber-300" /> : <Droplets className="w-4 h-4 text-green-200" />}
                </div>
              </div>
              {/* Zone C - Fallow */}
              <div className="relative rounded-lg overflow-hidden" style={{ background: "#5a9a5a" }}>
                <div className="absolute top-2 left-2 text-white text-xs font-medium">Zone C - {userData.zoneC || "Crop"}</div>
                <div className="absolute bottom-2 left-2 text-white/70 text-xs">0.8 acres</div>
                <div className="absolute top-2 right-2">
                  {zoneHasAlert("Zone C") ? <AlertTriangle className="w-4 h-4 text-amber-300" /> : null}
                </div>
              </div>
              {/* Water body */}
              <div className="relative rounded-lg overflow-hidden" style={{ background: "#2a6aaa", gridColumn: "span 2" }}>
                <div className="absolute top-2 left-2 text-white/80 text-xs font-medium">Water Body</div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-blue-200/50" />
                </div>
              </div>
            </div>
          </div>
          {/* Location badge */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm">
            <MapPin className="w-4 h-4 text-white" />
            <span className="text-white text-xs">{userData.locationType === "city" ? userData.city : userData.village}, {userData.state}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render active page content
  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {userData.sensorSetupStatus === "waiting" && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Wifi className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Waiting for first sensor packet</p>
                    <p className="text-sm text-amber-800">Device <span className="font-mono">{userData.sensorDeviceId}</span> is configured. The dashboard will switch to ESP32 Live after readings arrive.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" className="bg-white" onClick={testSensorConnection}>
                  Check now
                </Button>
              </div>
            )}
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={Droplets} title="Soil Moisture" value={sensorData.soilMoisture} unit="%" color="green" trend="down" trendValue="3%" progress={sensorData.soilMoisture} />
              <MetricCard icon={CloudSun} title="Temperature" value={sensorData.temperature} unit="°C" color="orange" trend="up" trendValue="2°" progress={(sensorData.temperature / 40) * 100} />
              <MetricCard icon={Radio} title="Humidity" value={sensorData.humidity} unit="%" color="blue" trend="up" trendValue="5%" progress={sensorData.humidity} />
              <MetricCard icon={Sprout} title="Soil pH" value={sensorData.soilPh} unit="" color="gold" trend="up" trendValue="0.1" progress={(sensorData.soilPh / 10) * 100} />
            </div>

            {/* Field Map and Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FieldMap />
              <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
                <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Moisture Trend (24h)</h3>
                <LineChart data={Array.from({ length: 24 }, () => 50 + Math.random() * 30)} color={colors.greenLight} height={200} />
              </div>
            </div>

            {/* Alerts & Health Score */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
                <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Active Alerts</h3>
                <div className="space-y-3">
                  {activeSensorAlerts.length ? (
                    activeSensorAlerts.slice(0, 4).map((alert) => {
                      const isCritical = alert.tone === "critical";
                      return (
                        <div
                          key={alert.id}
                          className="flex gap-3 p-3 rounded-lg"
                          style={{
                            background: isCritical ? "#fee2e2" : "#fef3c7",
                            border: `1px solid ${isCritical ? "#ef4444" : "#f59e0b"}`,
                          }}
                        >
                          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isCritical ? "text-red-600" : "text-amber-600"}`} />
                          <div>
                            <p className={`font-medium ${isCritical ? "text-red-800" : "text-amber-800"}`}>{alert.title}</p>
                            <p className={`text-sm ${isCritical ? "text-red-700" : "text-amber-700"}`}>{alert.body}</p>
                            <p className={`text-xs mt-1 ${isCritical ? "text-red-600" : "text-amber-600"}`}>Crop profile: {alert.crop}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">All sensor readings are normal</p>
                        <p className="text-sm text-green-700">Moisture, temperature, humidity and pH are inside the selected crop ranges.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
                <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Crop Health Score</h3>
                <div className="flex items-center gap-6">
                  <SemicircleGauge value={cropHealthScore} max={100} size={140} />
                  <div className="space-y-3">
                    {cropZones.map((zone) => {
                      const range = getCropSensorRange(zone.crop);
                      const zoneAlerts = activeSensorAlerts.filter((alert) => alert.zone === zone.name);
                      return (
                        <div key={zone.id} className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${zoneAlerts.length ? "bg-amber-100" : "bg-green-100"}`}>
                            {zoneAlerts.length ? <AlertTriangle className="w-5 h-5 text-amber-700" /> : <CheckCircle2 className="w-5 h-5 text-green-700" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: colors.textDark }}>{zone.name} - {range?.label || "Fallow"}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${zoneAlerts.length ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                              {zoneAlerts.length ? `${zoneAlerts.length} alert${zoneAlerts.length > 1 ? "s" : ""}` : "Normal"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "sensors":
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-[#d5d1c5] bg-[#f7f5ef] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: colors.textDark }}>Sensor connection</p>
                  <p className="text-xs text-slate-600">Device: <span className="font-mono">{sensorConnection.deviceId}</span></p>
                  <p className="text-xs text-slate-600">Status: <span className="font-semibold">{sensorConnection.source === "esp32" ? "ESP32 Live" : "Simulation"}</span></p>
                  {sensorConnection.error ? <p className="text-xs text-amber-800 mt-1">{sensorConnection.error}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-600">Last seen</p>
                  <p className="text-sm font-medium" style={{ color: colors.textDark }}>{sensorConnection.lastSeen ? new Date(sensorConnection.lastSeen).toLocaleTimeString() : "No packet yet"}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <SensorCard icon={Droplets} title="Soil Moisture" value={sensorData.soilMoisture} unit="%" color="green" min="0%" max="100%" barValue={sensorData.soilMoisture} />
              <SensorCard icon={CloudSun} title="Temperature" value={sensorData.temperature} unit="°C" color="orange" min="10°C" max="45°C" barValue={((sensorData.temperature - 10) / 35) * 100} />
              <SensorCard icon={Radio} title="Humidity" value={sensorData.humidity} unit="%" color="blue" min="0%" max="100%" barValue={sensorData.humidity} />
              <SensorCard icon={Sprout} title="Soil pH" value={sensorData.soilPh} unit="" color="gold" min="4" max="10" barValue={((sensorData.soilPh - 4) / 6) * 100} />
              <SensorCard icon={Leaf} title="Nitrogen" value={sensorData.nitrogen} unit="mg/kg" color="green" min="0" max="100" barValue={Math.min(sensorData.nitrogen, 100)} />
              <SensorCard icon={Wheat} title="Phosphorus" value={sensorData.phosphorus} unit="mg/kg" color="orange" min="0" max="100" barValue={Math.min(sensorData.phosphorus, 100)} />
              <SensorCard icon={Flower2} title="Potassium" value={sensorData.potassium} unit="mg/kg" color="blue" min="0" max="100" barValue={Math.min(sensorData.potassium, 100)} />
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="font-semibold" style={{ color: colors.textDark }}>Crop Sensor Alert Ranges</h3>
                <span className="text-xs" style={{ color: colors.textLight }}>NPK sensors are monitored separately and do not trigger these alerts.</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.creamDark }}>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Zone</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Crop profile</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Moisture</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Temp</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Humidity</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>pH</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cropZones.map((zone) => {
                    const range = getCropSensorRange(zone.crop);
                    const zoneAlerts = activeSensorAlerts.filter((alert) => alert.zone === zone.name);
                    return (
                      <tr key={zone.id} className="border-b last:border-0" style={{ borderColor: colors.creamDark }}>
                        <td className="py-3 px-3 font-medium" style={{ color: colors.textDark }}>{zone.name}</td>
                        <td className="py-3 px-3" style={{ color: colors.textMid }}>{range?.label || "Fallow"}</td>
                        <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{range ? formatRange(range.soilMoisture, "%") : "-"}</td>
                        <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{range ? formatRange(range.temperature, "°C") : "-"}</td>
                        <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{range ? formatRange(range.humidity, "%") : "-"}</td>
                        <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{range ? formatRange(range.soilPh, "") : "-"}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${zoneAlerts.length ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            {range ? (zoneAlerts.length ? `${zoneAlerts.length} alert${zoneAlerts.length > 1 ? "s" : ""}` : "Normal") : "No crop"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm overflow-x-auto">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Sensor Nodes</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: colors.creamDark }}>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Node ID</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Zone</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Moisture</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Temp</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Humidity</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>pH</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>NPK</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Status</th>
                    <th className="text-left py-3 px-3 font-medium" style={{ color: colors.textMid }}>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b" style={{ borderColor: colors.creamDark }}>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{userData.sensorDeviceId || "sim-node-1"}</td>
                    <td className="py-3 px-3" style={{ color: colors.textMid }}>Zone A</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{sensorData.soilMoisture}%</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{sensorData.temperature}°C</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{sensorData.humidity}%</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{sensorData.soilPh}</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>{sensorData.nitrogen}/{sensorData.phosphorus}/{sensorData.potassium}</td>
                    <td className="py-3 px-3"><StatusChip status="OK" /></td>
                    <td className="py-3 px-3 text-xs" style={{ color: colors.textLight }}>
                      {sensorConnection.lastSeen ? new Date(sensorConnection.lastSeen).toLocaleTimeString() : userData.sensorSetupStatus === "waiting" ? "Waiting for first packet" : "Live simulation"}
                    </td>
                  </tr>
                  <tr className="border-b" style={{ borderColor: colors.creamDark }}>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>sim-node-2</td>
                    <td className="py-3 px-3" style={{ color: colors.textMid }}>Zone B</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>48%</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>29°C</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>71%</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>6.5</td>
                    <td className="py-3 px-3"><StatusChip status="WARN" /></td>
                    <td className="py-3 px-3 text-xs" style={{ color: colors.textLight }}>2 min ago</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>sim-node-3</td>
                    <td className="py-3 px-3" style={{ color: colors.textMid }}>Zone C</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>65%</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>27°C</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>76%</td>
                    <td className="py-3 px-3 font-mono" style={{ color: colors.textDark }}>6.9</td>
                    <td className="py-3 px-3"><StatusChip status="OK" /></td>
                    <td className="py-3 px-3 text-xs" style={{ color: colors.textLight }}>5 min ago</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

      case "pump":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PumpCard id="pump1" name="Main Pump" zone="Zone A - Wheat Field" pump={pumps.pump1} />
              <PumpCard id="pump2" name="Secondary Pump" zone="Zone B - Vegetable Garden" pump={pumps.pump2} />
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Weekly Irrigation Log</h3>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-3 sm:gap-4 h-44 min-w-[440px]">
                {[
                  { day: "Mon", value: 65, color: colors.greenLight },
                  { day: "Tue", value: 80, color: colors.greenLight },
                  { day: "Wed", value: 45, color: colors.greenLight },
                  { day: "Thu", value: 70, color: colors.greenLight },
                  { day: "Fri", value: 55, color: colors.greenLight },
                  { day: "Sat", value: 90, color: colors.terracotta },
                  { day: "Sun", value: 30, color: colors.greenLight },
                ].map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <span className="text-xs font-mono" style={{ color: colors.textMid }}>{item.value} min</span>
                    <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${item.value}%`, background: item.color }} />
                    <span className="text-xs" style={{ color: colors.textLight }}>{item.day}</span>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "weather":
        const weather = weatherData || { temp: sensorData.temperature, condition: "⛅", humidity: sensorData.humidity, wind: 12, pressure: 1013 };
        const weatherCond = getWeatherCondition(weather.temp);
        const rainfallSeries = weatherData?.rainfall || [];
        const rainfallPoints = rainfallSeries.map((item, index) => {
          const x = rainfallSeries.length <= 1 ? 20 : 20 + (index * 260) / (rainfallSeries.length - 1);
          const y = 100 - Math.max(0, Math.min(100, item.value || 0)) * 0.8;
          return { ...item, x, y };
        });
        const rainfallLine = rainfallPoints.map((point) => `${point.x},${point.y}`).join(" ");
        const rainfallArea = rainfallPoints.length
          ? `20,108 ${rainfallLine} ${rainfallPoints[rainfallPoints.length - 1].x},108`
          : "";
        const peakRainfall = rainfallSeries.reduce((peak, item) => Math.max(peak, item.value || 0), 0);
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-xl" style={{ background: `linear-gradient(135deg, ${colors.greenDark}, #0f2a1f)` }}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-white/70" />
                  <p className="text-sm" style={{ color: colors.creamDark }}>{userData.locationType === "city" ? userData.city : userData.village}, {userData.state}</p>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-5xl">{weatherCond.icon}</span>
                  <div>
                    <p className="text-4xl font-mono font-bold" style={{ color: colors.cream }}>{weather.temp}°C</p>
                    <p className="text-lg" style={{ color: colors.creamDark }}>{weatherCond.condition}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <p className="text-xs" style={{ color: colors.creamDark }}>Humidity</p>
                    <p className="text-lg font-mono" style={{ color: colors.cream }}>{weather.humidity}%</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <p className="text-xs" style={{ color: colors.creamDark }}>Wind</p>
                    <p className="text-lg font-mono" style={{ color: colors.cream }}>{weather.wind} km/h</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <p className="text-xs" style={{ color: colors.creamDark }}>Pressure</p>
                    <p className="text-lg font-mono" style={{ color: colors.cream }}>{weather.pressure} hPa</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <p className="text-sm" style={{ color: colors.creamDark }}>💡 <strong>Advice:</strong> {weatherCond.advice}</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold" style={{ color: colors.textDark }}>7-Day Rainfall Prediction</h3>
                    <p className="text-xs mt-1" style={{ color: colors.textLight }}>Live internet probability forecast</p>
                  </div>
                  {rainfallSeries.length > 0 && (
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-xs font-mono text-blue-700">
                      Peak {peakRainfall}%
                    </span>
                  )}
                </div>

                {rainfallSeries.length > 0 ? (
                  <div>
                    <div className="h-40">
                      <svg viewBox="0 0 300 126" className="h-full w-full" role="img" aria-label="7 day rainfall probability graph">
                        {[20, 40, 60, 80, 100].map((value) => (
                          <g key={value}>
                            <line x1="20" x2="285" y1={108 - value * 0.8} y2={108 - value * 0.8} stroke="#E5E7EB" strokeWidth="1" />
                            <text x="0" y={112 - value * 0.8} fontSize="8" fill="#8A9488">{value}</text>
                          </g>
                        ))}
                        <polygon points={rainfallArea} fill="rgba(59, 130, 246, 0.14)" />
                        <polyline points={rainfallLine} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {rainfallPoints.map((point) => (
                          <g key={point.date || point.day}>
                            <circle cx={point.x} cy={point.y} r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                            <text x={point.x} y={point.y - 9} textAnchor="middle" fontSize="9" fill="#1A201C">{point.value}%</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-2">
                      {rainfallSeries.map((item) => (
                        <div key={item.date || item.day} className="text-center">
                          <p className="text-[11px] font-medium" style={{ color: colors.textDark }}>{item.day}</p>
                          <p className="text-[10px]" style={{ color: colors.textLight }}>{item.mm} mm</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-center text-sm" style={{ color: colors.textLight }}>
                    {weatherError ? "Live rainfall probability unavailable" : "Loading live rainfall probability..."}
                  </div>
                )}
                <p className="text-xs text-center" style={{ color: colors.textLight }}>
                  Live internet source: {weatherData?.source || (weatherError ? "Unavailable" : "Loading")}
                </p>
                {weatherData?.location && (
                  <p className="mt-1 text-xs text-center" style={{ color: colors.textLight }}>
                    Location: {[weatherData.location.name, weatherData.location.admin1].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>7-Day Forecast</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                {(weatherData?.forecast || [{ day: "Today", icon: "⛅", high: 29, low: 18 }, { day: "Fri", icon: "🌤️", high: 31, low: 19 }, { day: "Sat", icon: "🌧️", high: 26, low: 17 }, { day: "Sun", icon: "⛅", high: 28, low: 18 }, { day: "Mon", icon: "☀️", high: 32, low: 20 }]).map((item) => (
                  <div key={item.day} className="p-4 rounded-xl bg-gray-50 text-center">
                    <p className="text-sm font-medium mb-2" style={{ color: colors.textDark }}>{item.day}</p>
                    <span className="text-3xl">{item.icon}</span>
                    <div className="mt-2">
                      <p className="font-mono font-bold" style={{ color: colors.textDark }}>{item.high}°</p>
                      <p className="text-sm" style={{ color: colors.textLight }}>{item.low}°</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Crop Weather Impact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border-l-4" style={{ borderLeftColor: colors.greenLight, background: "#f0fdf4" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wheat className="w-5 h-5" style={{ color: colors.greenLight }} />
                    <span className="font-medium" style={{ color: colors.textDark }}>Wheat</span>
                  </div>
                  <p className="text-sm" style={{ color: colors.textMid }}>Healthy growth conditions. Current temperature ideal for grain filling stage.</p>
                </div>
                <div className="p-4 rounded-xl border-l-4" style={{ borderLeftColor: colors.gold, background: "#fffbeb" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sprout className="w-5 h-5" style={{ color: colors.gold }} />
                    <span className="font-medium" style={{ color: colors.textDark }}>Soybean</span>
                  </div>
                  <p className="text-sm" style={{ color: colors.textMid }}>Monitor soil moisture. Consider irrigation if levels drop below 50%.</p>
                </div>
                <div className="p-4 rounded-xl border-l-4" style={{ borderLeftColor: colors.greenLight, background: "#f0fdf4" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Flower2 className="w-5 h-5" style={{ color: colors.greenLight }} />
                    <span className="font-medium" style={{ color: colors.textDark }}>Onion Nursery</span>
                  </div>
                  <p className="text-sm" style={{ color: colors.textMid }}>Optimal conditions for transplanting. Plan for next week.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        const notificationItems = [
          ...activeSensorAlerts.map((alert) => ({
            icon: alert.icon,
            title: alert.title,
            body: alert.body,
            tone: alert.tone === "critical" ? colors.red : colors.terracotta,
            time: alert.time,
          })),
          { icon: CloudSun, title: "Rain chance updated", body: `Latest forecast shows ${Math.max(...(weatherData?.rainfall || [{ value: 0 }]).map((item) => item.value))}% peak rainfall probability this week.`, tone: colors.blue, time: "12 min ago" },
          { icon: Info, title: "Pump schedule ready", body: "Weekly irrigation log is available on the Pump Control page.", tone: colors.greenLight, time: "Today" },
        ];

        return (
          <div className="space-y-4">
            {activeSensorAlerts.length === 0 && (
              <div className="p-4 sm:p-5 rounded-xl bg-green-50 border border-green-200 shadow-sm flex items-start gap-4">
                <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-green-900">No crop sensor alerts</h3>
                  <p className="mt-1 text-sm text-green-800">All non-NPK readings are inside the normal crop range for the selected zones.</p>
                </div>
              </div>
            )}
            {notificationItems.map((item) => (
              <div key={item.title} className="p-4 sm:p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm flex items-start gap-4">
                <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.tone}18`, color: item.tone }}>
                  <item.icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h3 className="font-semibold" style={{ color: colors.textDark }}>{item.title}</h3>
                    <span className="text-xs" style={{ color: colors.textLight }}>{item.time}</span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: colors.textMid }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case "market":
        const prices = marketData?.prices || marketPricesByRegion.default.prices;
        const mandis = marketData?.mandis || marketPricesByRegion.default.mandis;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: colors.textDark }}>Today's Crop Prices</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600">{userData.state}</span>
                </div>
                <div className="space-y-3">
                  {prices.map((crop) => (
                    <div key={crop.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{crop.emoji}</span>
                        <div>
                          <p className="font-medium" style={{ color: colors.textDark }}>{crop.name}</p>
                          <p className="text-xs" style={{ color: colors.textLight }}>MSP: ₹{Math.round(crop.price * 0.85)}/qt</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold" style={{ color: colors.textDark }}>₹{crop.price.toLocaleString()}</p>
                        <p className={`text-sm flex items-center justify-end gap-1 ${crop.up ? "text-green-600" : "text-red-600"}`}>
                          {crop.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {crop.change}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {mandis.map((mandi, idx) => (
                  <div key={mandi.name} className="p-5 rounded-xl" style={{ background: idx === 0 ? `linear-gradient(135deg, ${colors.greenDark}, #0f2a1f)` : `linear-gradient(135deg, ${colors.terracotta}, #a0522d)` }}>
                    <h3 className="font-semibold mb-3" style={{ color: colors.cream }}>{mandi.name}</h3>
                    <p className="text-sm mb-3" style={{ color: colors.creamDark }}>📍 {mandi.distance} km away</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(mandi.crops).map(([crop, price]) => (
                        <span key={crop} className="px-2 py-1 text-xs rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: colors.cream }}>
                          {crop.charAt(0).toUpperCase() + crop.slice(1)} ₹{price}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Best Selling Advice</h3>
              <div className="space-y-3">
                <div className="flex gap-3 p-3 rounded-lg" style={{ background: "#dbeafe", border: "1px solid #3b82f6" }}>
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Sell Onions Now</p>
                    <p className="text-sm text-blue-700">Prices at 5-week high. Expected to drop after harvest season.</p>
                    <p className="text-xs text-blue-600 mt-1">Updated 30 min ago</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-lg" style={{ background: "#fef3c7", border: "1px solid #f59e0b" }}>
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Hold Soybean Inventory</p>
                    <p className="text-sm text-amber-700">Export demand expected to rise next month. Consider storing.</p>
                    <p className="text-xs text-amber-600 mt-1">Updated 2 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "flow":
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-xl" style={{ background: `linear-gradient(135deg, ${colors.greenDark}, #0f2a1f)` }}>
              <h3 className="font-semibold mb-6" style={{ color: colors.cream }}>Data Pipeline</h3>
              <div className="flex items-center justify-between flex-wrap gap-4">
                {[
                  { icon: Radio, title: "Soil Sensors", desc: "Analog readings", note: "ADC 12-bit" },
                  { icon: Zap, title: "ESP32 Node", desc: "Edge processing", note: "WiFi + BLE" },
                  { icon: Radio, title: "LoRa Gateway", desc: "Long-range tx", note: "868 MHz" },
                  { icon: CloudSun, title: "FastAPI Cloud", desc: "Data ingestion", note: "REST API" },
                  { icon: LayoutDashboard, title: "App & Web", desc: "Visualization", note: "Real-time" },
                ].map((node, idx) => (
                  <div key={node.title} className="flex items-center gap-2">
                    <div className={`p-4 rounded-xl ${idx < 2 ? "ring-2 ring-amber-400" : ""}`} style={{ background: idx < 2 ? "rgba(200, 168, 75, 0.2)" : "rgba(255,255,255,0.1)" }}>
                      <node.icon className={`w-6 h-6 ${idx < 2 ? "text-amber-400" : "text-cream"}`} />
                    </div>
                    <div className={idx < 2 ? "text-amber-400" : "text-cream"}>
                      <p className="font-medium text-sm">{node.title}</p>
                      <p className="text-xs opacity-70">{node.desc}</p>
                      <p className="text-xs font-mono opacity-50 mt-1">{node.note}</p>
                    </div>
                    {idx < 4 && <span className="text-2xl text-cream animate-pulse" style={{ animationDuration: "2s" }}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(telemetryPacket).map(([key, value]) => (
                <div key={key} className="p-3 rounded-lg text-center" style={{ background: "rgba(30, 58, 47, 0.9)" }}>
                  <p className="text-xs font-mono mb-1" style={{ color: colors.textLight }}>{key}</p>
                  <p className="font-mono font-bold" style={{ color: colors.greenLight }}>{typeof value === "number" ? value : "..."}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-xl" style={{ background: "#0d1f17" }}>
                <h3 className="font-semibold mb-4" style={{ color: colors.greenLight }}>API Endpoint Log</h3>
                <div ref={logContainerRef} className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
                  {apiLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: colors.textLight }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={log.method === "GET" ? "text-blue-400" : log.method === "POST" ? "text-green-400" : "text-amber-400"}>{log.method}</span>
                      <span style={{ color: colors.cream }}>{log.path}</span>
                      <span className={log.status === 200 ? "text-green-400" : "text-amber-400"}>{log.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl" style={{ background: "#0d1f17" }}>
                <h3 className="font-semibold mb-4" style={{ color: colors.greenLight }}>Latest Telemetry Packet</h3>
                <pre className="font-mono text-sm overflow-x-auto" style={{ color: colors.cream }}>{JSON.stringify(telemetryPacket, null, 2)}</pre>
              </div>
            </div>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <div className="rounded-xl overflow-hidden flex flex-col" style={{ height: "500px" }}>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.type === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0`} style={msg.type === "bot" ? { background: colors.greenDark, color: "white" } : { background: `linear-gradient(135deg, ${colors.greenMid}, ${colors.terracotta})`, color: "white" }}>
                        {msg.type === "bot" ? "🌿" : userData.name.charAt(0)}
                      </div>
                      <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-xl ${msg.type === "bot" ? "bg-white border border-[#e8e3d8]" : ""}`} style={msg.type === "bot" ? { borderTopLeftRadius: "4px" } : { background: colors.greenDark, borderTopRightRadius: "4px" }}>
                        <p className="text-sm" style={{ color: msg.type === "bot" ? colors.textDark : colors.cream }} dangerouslySetInnerHTML={{ __html: formatChatHtml(msg.text) }} />
                        {msg.type === "user" && (
                          <p className="mt-2 text-xs" style={{ color: colors.goldLight }}>
                            Farm assistant
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: colors.greenDark, color: "white" }}>🌿</div>
                      <div className="p-4 rounded-xl bg-white border border-[#e8e3d8]">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {showSuggestions && (
                  <div className="px-4 py-2 flex gap-2 flex-wrap border-t" style={{ borderColor: colors.creamDark }}>
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleSuggestionClick(ct(chip), chip)}
                        className="px-3 py-1.5 text-sm rounded-full border transition-colors hover:bg-gray-50"
                        style={{ borderColor: colors.creamDark, color: colors.textMid }}
                      >
                        {ct(chip)}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 p-4 border-t" style={{ borderColor: colors.creamDark }}>
                  <div className="flex gap-2">
                    <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} placeholder={ct("chatPlaceholder")} className="flex-1" />
                    <Button 
                      onClick={isListening ? stopListening : startListening} 
                      disabled={isTyping}
                      className={`px-3 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isTyping} className="bg-green-600 hover:bg-green-700">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {language !== 'en' && (
                    <p className="text-xs text-gray-500">
                      Voice input listens in {languages.find((lang) => lang.code === language)?.name || language}; replies use the selected language.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>{t("language")}</h3>
              <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <LanguageSelect value={language} onChange={setLanguage} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      localStorage.setItem("cropconnect-language", lang.code);
                      setLanguage(lang.code);
                      toast.success(`Language changed to ${lang.name}`);
                    }}
                    className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                      language === lang.code
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Languages className="w-4 h-4" style={{ color: colors.greenDark }} />
                    <span className="text-lg font-medium" style={{ color: colors.textDark }}>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>{t("appearance")}</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setTheme("light");
                    toast.success("Light mode enabled");
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 flex flex-col items-center gap-2 ${theme === "light" ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"}`}
                >
                  <Sun className="w-8 h-8 text-amber-500" />
                  <span className="font-medium" style={{ color: colors.textDark }}>{t("lightMode")}</span>
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    toast.success("Dark mode enabled");
                  }}
                  className={`flex-1 p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${theme === "dark" ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"}`}
                >
                  <Moon className="w-8 h-8 text-gray-600" />
                  <span className="font-medium" style={{ color: colors.textDark }}>{t("darkMode")}</span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Contact Us</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: colors.cream }}>
                  <Mail className="w-5 h-5" style={{ color: colors.greenDark }} />
                  <div>
                    <p className="font-medium" style={{ color: colors.textDark }}>Email</p>
                    <p className="text-sm" style={{ color: colors.textMid }}>cropconnectco@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: colors.cream }}>
                  <Phone className="w-5 h-5" style={{ color: colors.greenDark }} />
                  <div>
                    <p className="font-medium" style={{ color: colors.textDark }}>Phone</p>
                    <p className="text-sm" style={{ color: colors.textMid }}>+91 94791 87552</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: colors.cream }}>
                  <MessageCircle className="w-5 h-5" style={{ color: colors.greenDark }} />
                  <div>
                    <p className="font-medium" style={{ color: colors.textDark }}>WhatsApp</p>
                    <p className="text-sm" style={{ color: colors.textMid }}>+91 94791 87552</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>About</h3>
              <p className="text-sm" style={{ color: colors.textMid }}>
                CropConnect v1.0.0 - Smart Farming Dashboard<br />
                Empowering farmers with IoT and AI technology
              </p>
            </div>
          </div>
        );

      case "profile":
        const handleEditProfile = async () => {
          if (isEditingProfile) {
            const updatedUser = { ...userData, ...editData };
            const location = updatedUser.locationType === "village"
              ? updatedUser.village || updatedUser.city || ""
              : updatedUser.city || updatedUser.village || "";

            setUserData(updatedUser);
            localStorage.setItem("cropconnect-user", JSON.stringify(updatedUser));

            try {
              const mysqlUser = await saveUserToMysql({
                name: updatedUser.name,
                phone: updatedUser.phone,
                state: updatedUser.state,
                location,
                location_type: updatedUser.locationType || "city",
                city: updatedUser.city || "",
                village: updatedUser.village || "",
                land_size: updatedUser.landSize ? Number(updatedUser.landSize) : null,
                sensors: updatedUser.sensors || "0",
                pumps: updatedUser.pumps || "0",
              });
              const mergedUser = mysqlUser ? { ...updatedUser, ...mysqlUser } : updatedUser;
              setUserData(mergedUser);
              localStorage.setItem("cropconnect-user", JSON.stringify(mergedUser));
              toast.success("Profile updated in MySQL!");
            } catch (error) {
              toast.error(error.message || "Profile saved locally, but MySQL update failed");
            }
          } else {
            setEditData(userData);
          }
          setIsEditingProfile(!isEditingProfile);
        };

        return (
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: colors.greenDark, color: "white" }}>
                    {userData.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold" style={{ color: colors.textDark }}>{userData.name}</h3>
                    <p className="text-sm" style={{ color: colors.textMid }}>{userData.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleEditProfile}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isEditingProfile
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  style={{ color: isEditingProfile ? "white" : colors.textDark }}
                >
                  {isEditingProfile ? "Save" : "Edit Profile"}
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Full Name", key: "name", type: "text" },
                  { label: "Email", key: "email", type: "email" },
                  { label: "State", key: "state", type: "text" },
                  { label: userData.locationType === "city" ? "City" : "Village", key: userData.locationType === "city" ? "city" : "village", type: "text" },
                  { label: "Land Size (acres)", key: "landSize", type: "text" },
                  { label: "Crop Type", key: "cropType", type: "text" },
                  { label: "Farming Type", key: "farmingType", type: "text" },
                  { label: "Zone A (Crops)", key: "zoneA", type: "text" },
                  { label: "Zone B (Crops)", key: "zoneB", type: "text" },
                  { label: "Zone C (Crops)", key: "zoneC", type: "text" },
                ].map((field) => (
                  <div key={field.key} className="flex justify-between items-center py-3 border-b" style={{ borderColor: colors.creamDark }}>
                    <span className="font-medium" style={{ color: colors.textDark }}>{field.label}</span>
                    {isEditingProfile ? (
                      <input
                        type={field.type}
                        value={editData[field.key] || ""}
                        onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                        className="px-3 py-1 rounded border border-gray-300 text-right"
                        style={{ color: colors.textMid }}
                      />
                    ) : (
                      <span style={{ color: colors.textMid }}>{userData[field.key]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Farm Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ background: colors.cream }}>
                  <p className="text-sm" style={{ color: colors.textMid }}>Total Area</p>
                  <p className="text-xl font-bold" style={{ color: colors.textDark }}>{userData.landSize} acres</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: colors.cream }}>
                  <p className="text-sm" style={{ color: colors.textMid }}>Zones</p>
                  <p className="text-xl font-bold" style={{ color: colors.textDark }}>3</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: colors.cream }}>
                  <p className="text-sm" style={{ color: colors.textMid }}>Active Sensors</p>
                  <p className="text-xl font-bold" style={{ color: colors.textDark }}>{userData.sensors}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: colors.cream }}>
                  <p className="text-sm" style={{ color: colors.textMid }}>Irrigation Pumps</p>
                  <p className="text-xl font-bold" style={{ color: colors.textDark }}>{userData.pumps}</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white border border-[#e8e3d8] shadow-sm">
              <h3 className="font-semibold mb-4" style={{ color: colors.textDark }}>Zone Details</h3>
              <div className="space-y-3">
                {[
                  { zone: "Zone A", crops: userData.zoneA, area: "1.2 acres", status: "Active" },
                  { zone: "Zone B", crops: userData.zoneB, area: "0.5 acres", status: "Active" },
                  { zone: "Zone C", crops: userData.zoneC, area: "0.8 acres", status: "Fallow" },
                ].map((zone) => (
                  <div key={zone.zone} className="flex items-center justify-between p-3 rounded-lg" style={{ background: colors.cream }}>
                    <div>
                      <p className="font-medium" style={{ color: colors.textDark }}>{zone.zone}</p>
                      <p className="text-sm" style={{ color: colors.textMid }}>{zone.crops} · {zone.area}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${zone.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {zone.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get user initials
  const getInitials = (name) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };
  const selectedNavItem = navItems.find((item) => item.id === activePage) || navItems[0];
  const SensorSetupWindow = () => {
    const examplePayload = JSON.stringify(
      {
        device_id: sensorDeviceId,
        soil_moisture: 62.4,
        humidity: 74.2,
        temperature: 28.6,
        ph: 6.8,
        nitrogen: 42,
        phosphorus: 19,
        potassium: 31,
      },
      null,
      2
    );
    const curlExample = `curl -X POST ${sensorIngestUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${sensorSetupForm.apiKey}" \\
  -d '${examplePayload.replace(/\n/g, " ")}'`;

    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#0b1510]/70 backdrop-blur-sm">
        <div className="min-h-full px-3 py-5 sm:px-6 sm:py-8 flex items-start justify-center">
          <div className="w-full max-w-5xl rounded-xl bg-[#FDFBF7] border border-[#D5D1C5] shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-5 sm:p-8" style={{ background: colors.greenDark }}>
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-lg flex items-center justify-center bg-white/10 text-white">
                    <Router className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase font-semibold tracking-[0.16em]" style={{ color: colors.goldLight }}>First setup</p>
                    <h2 className="font-display text-2xl text-white">Connect your farm sensors</h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-white/75">
                  CropConnect works best with live ESP32 readings. Add this device ID to your farm node, send telemetry to the API endpoint, and the dashboard will switch from demo readings to real farm data automatically.
                </p>
                <div className="mt-7 space-y-3">
                  {[
                    { icon: Wifi, title: "ESP32 sends readings", text: "Soil moisture, temperature, humidity, pH and NPK values." },
                    { icon: ShieldCheck, title: "API key protects ingest", text: "Each telemetry request must include the configured X-API-Key." },
                    { icon: CheckCircle2, title: "Dashboard updates live", text: "Latest readings appear in Sensors, Weather, AI and Pump decisions." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 rounded-lg bg-white/8 p-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" style={{ color: colors.goldLight }} />
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-white/65">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.16em]" style={{ color: colors.textLight }}>Device ID</Label>
                    <Input
                      value={sensorSetupForm.deviceId}
                      onChange={(event) => setSensorSetupForm((prev) => ({ ...prev, deviceId: event.target.value }))}
                      className="mt-2 bg-white border-[#D5D1C5]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.16em]" style={{ color: colors.textLight }}>Sensor nodes</Label>
                    <Input
                      type="number"
                      min="1"
                      value={sensorSetupForm.nodeCount}
                      onChange={(event) => setSensorSetupForm((prev) => ({ ...prev, nodeCount: event.target.value }))}
                      className="mt-2 bg-white border-[#D5D1C5]"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#D5D1C5] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.16em]" style={{ color: colors.textLight }}>Telemetry endpoint</p>
                      <p className="mt-1 font-mono text-sm truncate" style={{ color: colors.textDark }}>{sensorIngestUrl}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(sensorIngestUrl, "Endpoint copied")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-[#D5D1C5] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em]" style={{ color: colors.textLight }}>ESP32 API key</p>
                      <p className="mt-1 font-mono text-sm" style={{ color: colors.textDark }}>{sensorSetupForm.apiKey}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(sensorSetupForm.apiKey, "API key copied")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-[#101f17] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/60">Test request</p>
                    <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => copyToClipboard(curlExample, "Test request copied")}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <pre className="text-xs text-white/80 overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
                </div>

                {setupCheckResult && (
                  <div className={`rounded-lg border p-3 text-sm ${
                    setupCheckResult.type === "success"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : setupCheckResult.type === "error"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}>
                    {setupCheckResult.text}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button type="button" onClick={testSensorConnection} disabled={setupChecking || !sensorDeviceId} className="bg-[#1B4332] hover:bg-[#0F2A1F] text-white">
                    {setupChecking ? "Checking..." : "Test live connection"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => saveSensorSetup("waiting")} className="bg-white">
                    Save setup and open dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen dashboard-shell ${isDark ? "dashboard-dark" : "dashboard-light"}`} style={{ background: colors.bodyBg }}>
      {!userData.sensorSetupComplete && <SensorSetupWindow />}
      {/* Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 overflow-y-auto" style={{ width: 240, background: colors.greenDark }}>
        <div className="relative min-h-full flex flex-col">
          <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: colors.greenMid }}>
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display font-bold text-white">CropConnect</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: colors.textLight }}>{t("farmDashboard")}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider px-3 mb-2" style={{ color: colors.textLight }}>{t("overview")}</p>
              {navItems.slice(0, 2).map((item) => (
                <button key={item.id} onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${activePage === item.id ? "bg-white/12" : "hover:bg-white/5"}`}>
                  {activePage === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: colors.gold }} />}
                  <item.icon className={`w-4 h-4 ${activePage === item.id ? "text-white" : "text-white/60"}`} />
                  <span className={`text-sm ${activePage === item.id ? "text-white" : "text-white/70"}`}>{item.label}</span>
                  {item.badge && <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full" style={{ background: item.badge === t("live") ? colors.greenLight : colors.terracotta, color: "white" }}>{item.badge}</span>}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider px-3 mb-2" style={{ color: colors.textLight }}>{t("control")}</p>
              {navItems.slice(2, 4).map((item) => (
                <button key={item.id} onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${activePage === item.id ? "bg-white/12" : "hover:bg-white/5"}`}>
                  {activePage === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: colors.gold }} />}
                  <item.icon className={`w-4 h-4 ${activePage === item.id ? "text-white" : "text-white/60"}`} />
                  <span className={`text-sm ${activePage === item.id ? "text-white" : "text-white/70"}`}>{item.label}</span>
                </button>
              ))}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider px-3 mb-2" style={{ color: colors.textLight }}>{t("intelligence")}</p>
              {navItems.slice(4).map((item) => (
                <button key={item.id} onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${activePage === item.id ? "bg-white/12" : "hover:bg-white/5"}`}>
                  {activePage === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: colors.gold }} />}
                  <item.icon className={`w-4 h-4 ${activePage === item.id ? "text-white" : "text-white/60"}`} />
                  <span className={`text-sm ${activePage === item.id ? "text-white" : "text-white/70"}`}>{item.label}</span>
                  {item.badge && <span className="ml-auto px-1.5 py-0.5 text-[10px] rounded-full" style={{ background: colors.terracotta, color: "white" }}>{item.badge}</span>}
                </button>
              ))}
            </div>
          </nav>

          <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: `linear-gradient(135deg, ${colors.greenMid}, ${colors.terracotta})` }}>
                {getInitials(userData.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userData.name}</p>
                <p className="text-xs" style={{ color: colors.textLight }}>{userData.locationType === "city" ? userData.city : userData.village} · {userData.landSize} acres</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <LogOut className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${colors.greenAccent}30 0%, transparent 70%)` }} />
        </div>
      </aside>

      <main className="transition-all duration-300 md:ml-[240px]">
        <header className="fixed top-0 left-0 md:left-[240px] right-0 z-30 backdrop-blur-md" style={{ height: 64, background: "rgba(245, 242, 236, 0.92)", borderBottom: "1px solid rgba(213, 209, 197, 0.5)" }}>
          <div className="h-full flex items-center justify-between gap-3 px-3 sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <label className="relative flex items-center md:hidden">
                <selectedNavItem.icon className="pointer-events-none absolute left-3 w-4 h-4" style={{ color: colors.greenDark }} />
                <select
                  value={activePage}
                  onChange={(event) => setActivePage(event.target.value)}
                  className="h-10 w-[152px] appearance-none rounded-lg border border-[#d5d1c5] bg-white pl-9 pr-8 text-sm font-medium outline-none focus:ring-2 focus:ring-[#1B4332]/20"
                  style={{ color: colors.textDark }}
                  aria-label="Switch dashboard page"
                >
                  {navItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 w-4 h-4" style={{ color: colors.textLight }} />
              </label>
              <div className="min-w-0">
              <h1 className="font-display text-xl font-bold" style={{ color: colors.textDark }}>{pageConfig[activePage]?.title || t("dashboard")}</h1>
                <p className="hidden sm:block text-xs truncate" style={{ color: colors.textLight }}>{pageConfig[activePage]?.subtitle || "Farm overview"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:flex flex-col gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(45, 90, 61, 0.1)" }}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${sensorConnection.source === "esp32" ? "bg-green-500" : "bg-amber-500"}`} />
                  <span className="text-xs font-medium" style={{ color: colors.greenDark }}>
                    {sensorConnection.deviceId} · {sensorConnection.source === "esp32" ? "ESP32 Live" : "Simulation"}
                  </span>
                </div>
                {sensorConnection.source !== "esp32" && sensorConnection.error ? (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-amber-800">{sensorConnection.error}</span>
                ) : null}
              </div>
              <button onClick={() => setActivePage("notifications")} className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative" aria-label="Open notifications">
                <Bell className="w-4 h-4" style={{ color: colors.textMid }} />
                {activeSensorAlerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />}
              </button>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-5 md:p-6 pt-[80px] md:pt-[80px]">{renderPage()}</div>
      </main>

      <TimerModal />
    </div>
  );
}
