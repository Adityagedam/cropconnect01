import os
import json
import smtplib
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from email.message import EmailMessage
from typing import Any
from urllib.parse import urlparse
import mysql.connector
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from pump_control import (
    relay_command_text,
    relay_status_payload,
    router as pump_router,
    update_relay_applied_state,
    update_relay_command_state,
)


load_dotenv()


def env(name: str, default: str) -> str:
    return os.getenv(name, default)


db_url = os.getenv("MYSQL_PUBLIC_URL")

if db_url:
    url = urlparse(db_url)
    DB_CONFIG = {
        "host": url.hostname,
        "port": int(url.port or 3306),
        "user": url.username,
        "password": url.password,
        "database": url.path[1:] or "railway"
    }
else:
    DB_CONFIG = {
        "host": env("MYSQL_HOST", "127.0.0.1"),
        "port": int(env("MYSQL_PORT", "3306")),
        "user": env("MYSQL_USER", "root"),
        "password": env("MYSQL_PASSWORD", ""),
        "database": env("MYSQL_DATABASE", "cropconnect"),
    }
FARMERS_DATABASE = env("MYSQL_FARMERS_DATABASE", "farmers")

API_KEY = env("ESP32_API_KEY", "dev-secret-key")
CONTACT_TO_EMAIL = env("CONTACT_TO_EMAIL", "cropconnectco@gmail.com")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = env("OPENAI_MODEL", "gpt-4o-mini")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID", "")
RELAY_COMMANDS_LOADED_FROM_DB = False

PLANT_SOIL_TERMS = {
    "agriculture",
    "agronomy",
    "crop",
    "crops",
    "farm",
    "farming",
    "field",
    "plant",
    "plants",
    "seed",
    "seedling",
    "germination",
    "leaf",
    "leaves",
    "root",
    "roots",
    "stem",
    "flower",
    "fruit",
    "vegetable",
    "grain",
    "wheat",
    "rice",
    "maize",
    "corn",
    "soybean",
    "onion",
    "cotton",
    "sugarcane",
    "turmeric",
    "chilli",
    "groundnut",
    "soil",
    "moisture",
    "ph",
    "npk",
    "nitrogen",
    "phosphorus",
    "potassium",
    "fertilizer",
    "fertiliser",
    "compost",
    "manure",
    "irrigation",
    "irrigate",
    "water",
    "watering",
    "drip",
    "pest",
    "disease",
    "fungus",
    "fungal",
    "weed",
    "harvest",
    "sowing",
    "spray",
    "pesticide",
    "weather",
    "rain",
    "humidity",
    "temperature",
    "sensor",
    "sensors",
    "pani",
    "paani",
    "sinchai",
    "kheti",
    "khet",
    "mitti",
    "mati",
    "fasal",
    "khad",
    "khaad",
    "mausam",
    "barish",
    "baarish",
    "mandi",
    "bhav",
    "bazar",
}

MULTILINGUAL_PLANT_SOIL_TERMS = {
    "खेती",
    "खेत",
    "मिट्टी",
    "फसल",
    "पौधा",
    "पानी",
    "सिंचाई",
    "उर्वरक",
    "खाद",
    "मौसम",
    "कीट",
    "रोग",
    "शेती",
    "शेत",
    "माती",
    "पीक",
    "पाणी",
    "सिंचन",
    "खत",
    "हवामान",
    "పంట",
    "పొలం",
    "మట్టి",
    "నీరు",
    "సాగు",
    "ఎరువు",
    "వాతావరణం",
    "పురుగు",
    "நிலம்",
    "பயிர்",
    "மண்",
    "நீர்",
    "பாசனம்",
    "உரம்",
    "வானிலை",
    "நோய்",
    "খেত",
    "খামার",
    "মাটি",
    "ফসল",
    "সেচ",
    "সার",
    "আবহাওয়া",
    "রোগ",
    "ಕೃಷಿ",
    "ಹೊಲ",
    "ಮಣ್ಣು",
    "ಬೆಳೆ",
    "ನೀರು",
    "ನೀರಾವರಿ",
    "ಗೊಬ್ಬರ",
    "ಹವಾಮಾನ",
    "ರೋಗ",
}

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "te": "Telugu",
    "ta": "Tamil",
    "bn": "Bengali",
    "kn": "Kannada",
}

CHAT_REPLY_TEMPLATES = {
    "en": {
        "not_related": "Please ask a farming question about crops, soil, irrigation, fertilizer, weather, pests, or market prices.",
        "monsoon": "For {location}, choose crops that fit drainage and rainfall. With soil moisture near {moisture}% and pH {ph}, soybean, pigeon pea, maize, or green gram can work well if seed and market demand are good. Avoid waterlogging-sensitive crops if the field stays wet for more than 24-48 hours.",
        "health": "From the sensor data, crop conditions look manageable: moisture {moisture}%, temperature {temp}C, humidity {humidity}%, pH {ph}. Check leaves twice a week for spots, curling, yellowing, stem rot, or insects. Keep drainage open and tell me the crop plus symptom for a sharper treatment plan.",
        "soil": "For {location}, confirm soil type with a simple soil test. Loamy soil is usually best for many crops, sandy soil drains quickly, and clay soil holds water longer. Your pH reading is {ph}, so avoid major correction until a lab test confirms it.",
        "irrigation": "Your soil moisture is {moisture}%. Irrigation is usually not urgent above 55%, unless the crop is in flowering, fruiting, or the topsoil is drying fast. If it drops near 50-55%, irrigate in the morning or evening and avoid waterlogging.",
        "fertilizer": "Use fertilizer by crop stage and soil test. With pH around {ph}, nutrients are generally available if the reading is near 6.5-7.5. Use balanced NPK early, split nitrogen during active growth, and avoid fertilizer when soil is very dry.",
        "ph": "Your soil pH is {ph}. Most crops grow well around 6.0-7.5. Below 6.0, lime may help; above 8.0, organic matter, gypsum where suitable, and better drainage can help. Confirm with a soil lab before large treatment.",
        "weather": "At {location}, current context shows temperature {temp}C and humidity {humidity}%. Before irrigation or spraying, check local rain and wind. Avoid spraying in strong wind, high heat, or just before rain.",
        "market": "For selling near {location}, compare today's mandi price with storage cost, crop quality, and cash need. If price is above your target or quality may decline, sell part now and hold the rest to reduce risk.",
        "default": "Based on your farm context at {location}: moisture {moisture}%, temperature {temp}C, humidity {humidity}%, pH {ph}. Ask about irrigation, fertilizer, soil pH, crop health, weather, or market price for a direct recommendation.",
    },
    "hi": {
        "not_related": "कृपया फसल, मिट्टी, सिंचाई, उर्वरक, मौसम, कीट या बाजार भाव से जुड़ा खेती का प्रश्न पूछें।",
        "irrigation": "मिट्टी की नमी {moisture}% है। 55% से ऊपर आम तौर पर सिंचाई तुरंत जरूरी नहीं होती, जब तक फसल फूल/फल अवस्था में न हो या ऊपर की मिट्टी जल्दी सूख रही हो। 50-55% के पास सुबह या शाम सिंचाई करें और जलभराव से बचें।",
        "fertilizer": "उर्वरक फसल की अवस्था और मिट्टी जांच के आधार पर दें। pH {ph} के आसपास है, इसलिए 6.5-7.5 के पास पोषक तत्व सामान्यतः उपलब्ध रहते हैं। शुरुआत में संतुलित NPK दें और नाइट्रोजन को किश्तों में दें।",
        "ph": "मिट्टी का pH {ph} है। अधिकतर फसलें 6.0-7.5 में अच्छी बढ़ती हैं। 6.0 से कम हो तो चूना मदद कर सकता है, 8.0 से अधिक हो तो जैविक पदार्थ, उचित जगह जिप्सम और जल निकास सुधारें।",
        "weather": "{location} में तापमान {temp}C और आर्द्रता {humidity}% दिख रही है। सिंचाई या छिड़काव से पहले स्थानीय बारिश और हवा देखें। तेज हवा, ज्यादा गर्मी या बारिश से ठीक पहले छिड़काव न करें।",
        "market": "{location} के पास बेचने से पहले आज का मंडी भाव, भंडारण खर्च और फसल की गुणवत्ता मिलाकर देखें। भाव लक्ष्य से ऊपर हो या गुणवत्ता गिर सकती हो तो कुछ हिस्सा अभी बेचना सुरक्षित है।",
        "health": "सेंसर के अनुसार स्थिति संभालने योग्य है: नमी {moisture}%, तापमान {temp}C, आर्द्रता {humidity}%, pH {ph}। पत्तों पर धब्बे, पीलापन, मुड़ना, सड़न या कीट हफ्ते में दो बार देखें।",
        "soil": "{location} के लिए मिट्टी जांच सबसे भरोसेमंद है। दोमट मिट्टी अधिकतर फसलों के लिए अच्छी रहती है, रेतीली मिट्टी जल्दी सूखती है और चिकनी मिट्टी पानी ज्यादा रोकती है।",
        "monsoon": "{location} में बारिश और जल निकास के हिसाब से फसल चुनें। नमी {moisture}% और pH {ph} पर सोयाबीन, अरहर, मक्का या मूंग अच्छे विकल्प हो सकते हैं।",
        "default": "{location} के खेत डेटा के आधार पर: नमी {moisture}%, तापमान {temp}C, आर्द्रता {humidity}%, pH {ph}। सिंचाई, खाद, pH, फसल स्वास्थ्य, मौसम या भाव के बारे में पूछें।",
    },
    "mr": {
        "not_related": "कृपया पीक, माती, सिंचन, खत, हवामान, कीड किंवा बाजारभाव याबद्दल शेतीचा प्रश्न विचारा.",
        "irrigation": "मातीतील आर्द्रता {moisture}% आहे. 55% पेक्षा जास्त असेल तर बहुतेक वेळा सिंचन तातडीचे नसते, पण फुलोरा/फळधारणा किंवा वरची माती कोरडी असल्यास लक्ष द्या.",
        "fertilizer": "खत पिकाच्या अवस्थेनुसार आणि माती तपासणीनुसार द्या. pH {ph} असल्यास 6.5-7.5 जवळ पोषकद्रव्ये चांगली उपलब्ध राहतात. सुरुवातीला संतुलित NPK आणि नंतर नायट्रोजन हप्त्यांत द्या.",
        "ph": "मातीचा pH {ph} आहे. बहुतेक पिकांसाठी 6.0-7.5 चांगली श्रेणी आहे. मोठा बदल करण्याआधी माती प्रयोगशाळेची चाचणी करा.",
        "weather": "{location} येथे तापमान {temp}C आणि आर्द्रता {humidity}% आहे. सिंचन किंवा फवारणीपूर्वी स्थानिक पाऊस आणि वारा तपासा.",
        "market": "{location} जवळ विक्री करताना आजचा बाजारभाव, साठवण खर्च आणि पिकाची गुणवत्ता तुलना करा. भाव लक्ष्यापेक्षा जास्त असल्यास काही माल विकणे सुरक्षित ठरू शकते.",
        "health": "सेन्सरनुसार स्थिती नियंत्रणात दिसते: आर्द्रता {moisture}%, तापमान {temp}C, आर्द्रता {humidity}%, pH {ph}. पानांवरील डाग, पिवळेपणा, वाकणे किंवा कीड तपासा.",
        "soil": "{location} साठी माती तपासणी करा. दोमट माती बहुतेक पिकांसाठी चांगली, रेतीली माती पटकन निचरा करते आणि चिकणमाती पाणी धरून ठेवते.",
        "monsoon": "{location} मध्ये निचरा आणि पावसावरून पीक निवडा. नमी {moisture}% आणि pH {ph} असल्यास सोयाबीन, तूर, मका किंवा मूग चांगले पर्याय ठरू शकतात.",
        "default": "{location} मधील शेत डेटा: आर्द्रता {moisture}%, तापमान {temp}C, आर्द्रता {humidity}%, pH {ph}. सिंचन, खत, pH, पीक आरोग्य, हवामान किंवा बाजारभाव विचारा.",
    },
    "te": {
        "not_related": "దయచేసి పంట, మట్టి, నీరుపారుదల, ఎరువు, వాతావరణం, పురుగు లేదా మార్కెట్ ధరల గురించి వ్యవసాయ ప్రశ్న అడగండి.",
        "irrigation": "మట్టి తేమ {moisture}% ఉంది. సాధారణంగా 55% పైగా ఉంటే వెంటనే నీరు అవసరం లేదు, కానీ పుష్పం/కాయ దశలో లేదా పై మట్టి త్వరగా ఎండితే జాగ్రత్తగా చూడండి.",
        "fertilizer": "ఎరువును పంట దశ మరియు మట్టి పరీక్ష ఆధారంగా ఇవ్వండి. pH {ph} దగ్గరగా ఉంటే 6.5-7.5 పరిధిలో పోషకాలు బాగా అందుతాయి. మొదట సమతుల NPK, తరువాత నత్రజని విడతలుగా ఇవ్వండి.",
        "ph": "మీ మట్టి pH {ph}. చాలా పంటలకు 6.0-7.5 సరైనది. పెద్ద మార్పులకు ముందు మట్టి పరీక్ష చేయించండి.",
        "weather": "{location} వద్ద ఉష్ణోగ్రత {temp}C, ఆర్ద్రత {humidity}% ఉంది. నీరు లేదా స్ప్రే ముందు స్థానిక వర్షం, గాలి చూడండి.",
        "market": "{location} దగ్గర అమ్మే ముందు ఈరోజు మార్కెట్ ధర, నిల్వ ఖర్చు, పంట నాణ్యత పోల్చండి. ధర లక్ష్యానికి మించి ఉంటే కొంత భాగం అమ్మడం మంచిది.",
        "health": "సెన్సార్ డేటా ప్రకారం పరిస్థితి నియంత్రణలో ఉంది: తేమ {moisture}%, ఉష్ణోగ్రత {temp}C, ఆర్ద్రత {humidity}%, pH {ph}. ఆకుల మచ్చలు, పసుపు, ముడతలు లేదా పురుగులు పరిశీలించండి.",
        "soil": "{location} కోసం మట్టి పరీక్ష ఉత్తమం. లోమీ మట్టి చాలా పంటలకు మంచిది, ఇసుక మట్టి త్వరగా నీరు వదులుతుంది, మట్టి నేల నీరు ఎక్కువగా ఉంచుతుంది.",
        "monsoon": "{location} లో వర్షం, నీటి పారుదల బట్టి పంట ఎంచుకోండి. తేమ {moisture}% మరియు pH {ph} వద్ద సోయాబీన్, కంది, మొక్కజొన్న లేదా పెసలు మంచి ఎంపికలు కావచ్చు.",
        "default": "{location} ఫారం డేటా: తేమ {moisture}%, ఉష్ణోగ్రత {temp}C, ఆర్ద్రత {humidity}%, pH {ph}. నీరు, ఎరువు, pH, పంట ఆరోగ్యం, వాతావరణం లేదా ధర గురించి అడగండి.",
    },
    "ta": {
        "not_related": "பயிர், மண், பாசனம், உரம், வானிலை, பூச்சி அல்லது சந்தை விலை பற்றிய விவசாயக் கேள்வியை கேளுங்கள்.",
        "irrigation": "மண் ஈரப்பதம் {moisture}% உள்ளது. 55% மேல் இருந்தால் பெரும்பாலும் உடனடி பாசனம் தேவையில்லை; ஆனால் பூக்கும்/காய்க்கும் நிலையில் அல்லது மேல் மண் விரைவாக உலர்ந்தால் கவனிக்கவும்.",
        "fertilizer": "உரத்தை பயிர் நிலை மற்றும் மண் பரிசோதனை அடிப்படையில் கொடுங்கள். pH {ph} அருகில் இருந்தால் 6.5-7.5 வரம்பில் சத்துகள் நன்றாக கிடைக்கும்.",
        "ph": "மண் pH {ph}. பெரும்பாலான பயிர்களுக்கு 6.0-7.5 நல்ல வரம்பு. பெரிய திருத்தத்திற்கு முன் ஆய்வக மண் பரிசோதனை செய்யுங்கள்.",
        "weather": "{location} பகுதியில் வெப்பநிலை {temp}C, ஈரப்பதம் {humidity}% உள்ளது. பாசனம் அல்லது தெளிப்பதற்கு முன் உள்ளூர் மழை, காற்றை பாருங்கள்.",
        "market": "{location} அருகே விற்கும்போது இன்றைய சந்தை விலை, சேமிப்பு செலவு, பயிர் தரம் ஆகியவற்றை ஒப்பிடுங்கள். விலை இலக்கத்தை மீறினால் ஒரு பகுதியை இப்போது விற்கலாம்.",
        "health": "சென்சார் தரவுப்படி நிலை கட்டுப்பாட்டில் உள்ளது: ஈரப்பதம் {moisture}%, வெப்பநிலை {temp}C, ஈரப்பதம் {humidity}%, pH {ph}. இலை மஞ்சள், புள்ளி, சுருள் அல்லது பூச்சி பார்க்கவும்.",
        "soil": "{location} க்கு மண் பரிசோதனை நம்பகமானது. கலிமண் பல பயிர்களுக்கு நல்லது, மணற்பாங்கான மண் விரைவாக வடிகிறது, களிமண் நீரை நீண்ட நேரம் வைத்திருக்கும்.",
        "monsoon": "{location} இல் மழை மற்றும் வடிகால் அடிப்படையில் பயிர் தேர்வு செய்யுங்கள். ஈரப்பதம் {moisture}% மற்றும் pH {ph} எனில் சோயாபீன், துவரை, மக்காச்சோளம் அல்லது பாசிப்பயறு நல்ல தேர்வு.",
        "default": "{location} பண்ணை தரவு: ஈரப்பதம் {moisture}%, வெப்பநிலை {temp}C, ஈரப்பதம் {humidity}%, pH {ph}. பாசனம், உரம், pH, பயிர் ஆரோக்கியம், வானிலை அல்லது விலை பற்றி கேளுங்கள்.",
    },
    "bn": {
        "not_related": "দয়া করে ফসল, মাটি, সেচ, সার, আবহাওয়া, পোকা বা বাজারদর নিয়ে কৃষি প্রশ্ন করুন।",
        "irrigation": "মাটির আর্দ্রতা {moisture}%। 55% এর বেশি হলে সাধারণত এখনই সেচ জরুরি নয়, তবে ফুল/ফল ধাপ বা উপরিভাগ দ্রুত শুকালে নজর রাখুন।",
        "fertilizer": "সার ফসলের ধাপ ও মাটি পরীক্ষার ভিত্তিতে দিন। pH {ph} হলে 6.5-7.5 এর কাছে পুষ্টি সাধারণত ভালোভাবে মেলে। শুরুতে সুষম NPK দিন।",
        "ph": "মাটির pH {ph}। বেশিরভাগ ফসল 6.0-7.5 এ ভালো বাড়ে। বড় সংশোধনের আগে ল্যাব মাটি পরীক্ষা করুন।",
        "weather": "{location} এলাকায় তাপমাত্রা {temp}C এবং আর্দ্রতা {humidity}%। সেচ বা স্প্রে করার আগে স্থানীয় বৃষ্টি ও বাতাস দেখুন।",
        "market": "{location} এর কাছে বিক্রির আগে আজকের বাজারদর, সংরক্ষণ খরচ ও ফসলের মান মিলিয়ে দেখুন। দাম লক্ষ্যের বেশি হলে কিছু অংশ এখন বিক্রি করা ঝুঁকি কমায়।",
        "health": "সেন্সর অনুযায়ী অবস্থা সামলানো যায়: আর্দ্রতা {moisture}%, তাপমাত্রা {temp}C, আর্দ্রতা {humidity}%, pH {ph}। পাতায় দাগ, হলুদ হওয়া, কুঁকড়ে যাওয়া বা পোকা দেখুন।",
        "soil": "{location} এর জন্য মাটি পরীক্ষা সবচেয়ে নির্ভরযোগ্য। দোআঁশ মাটি অনেক ফসলের জন্য ভালো, বেলে মাটি দ্রুত শুকায়, কাদা মাটি জল ধরে রাখে।",
        "monsoon": "{location} এ বৃষ্টি ও নিকাশির উপর ফসল বেছে নিন। আর্দ্রতা {moisture}% এবং pH {ph} হলে সয়াবিন, অড়হর, ভুট্টা বা মুগ ভালো হতে পারে।",
        "default": "{location} খামার ডেটা: আর্দ্রতা {moisture}%, তাপমাত্রা {temp}C, আর্দ্রতা {humidity}%, pH {ph}। সেচ, সার, pH, ফসলের স্বাস্থ্য, আবহাওয়া বা দাম জিজ্ঞেস করুন।",
    },
    "kn": {
        "not_related": "ದಯವಿಟ್ಟು ಬೆಳೆ, ಮಣ್ಣು, ನೀರಾವರಿ, ಗೊಬ್ಬರ, ಹವಾಮಾನ, ಕೀಟ ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಕುರಿತು ಕೃಷಿ ಪ್ರಶ್ನೆ ಕೇಳಿ.",
        "irrigation": "ಮಣ್ಣಿನ ತೇವಾಂಶ {moisture}% ಇದೆ. 55% ಕ್ಕಿಂತ ಹೆಚ್ಚು ಇದ್ದರೆ ಸಾಮಾನ್ಯವಾಗಿ ತಕ್ಷಣ ನೀರಾವರಿ ಅಗತ್ಯವಿಲ್ಲ; ಆದರೆ ಹೂ/ಹಣ್ಣು ಹಂತದಲ್ಲಿದ್ದರೆ ಅಥವಾ ಮೇಲ್ಮಣ್ಣು ಬೇಗ ಒಣಗಿದರೆ ಗಮನಿಸಿ.",
        "fertilizer": "ಗೊಬ್ಬರವನ್ನು ಬೆಳೆ ಹಂತ ಮತ್ತು ಮಣ್ಣು ಪರೀಕ್ಷೆಯ ಆಧಾರದಲ್ಲಿ ಕೊಡಿ. pH {ph} ಇದ್ದರೆ 6.5-7.5 ಹತ್ತಿರ ಪೋಷಕಾಂಶಗಳು ಚೆನ್ನಾಗಿ ಲಭ್ಯವಾಗುತ್ತವೆ.",
        "ph": "ಮಣ್ಣಿನ pH {ph}. ಹೆಚ್ಚಿನ ಬೆಳೆಗಳಿಗೆ 6.0-7.5 ಉತ್ತಮ. ದೊಡ್ಡ ತಿದ್ದುಪಡಿ ಮಾಡುವ ಮೊದಲು ಪ್ರಯೋಗಾಲಯ ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮಾಡಿ.",
        "weather": "{location} ನಲ್ಲಿ ತಾಪಮಾನ {temp}C ಮತ್ತು ಆರ್ದ್ರತೆ {humidity}% ಇದೆ. ನೀರಾವರಿ ಅಥವಾ ಸಿಂಪಡಣೆಗೆ ಮೊದಲು ಸ್ಥಳೀಯ ಮಳೆ ಮತ್ತು ಗಾಳಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
        "market": "{location} ಹತ್ತಿರ ಮಾರಾಟ ಮಾಡುವ ಮೊದಲು ಇಂದಿನ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ, ಸಂಗ್ರಹ ವೆಚ್ಚ ಮತ್ತು ಬೆಳೆ ಗುಣಮಟ್ಟ ಹೋಲಿಸಿ. ಗುರಿಗಿಂತ ಬೆಲೆ ಮೇಲಾಗಿದ್ದರೆ ಕೆಲವಷ್ಟು ಈಗ ಮಾರಾಟ ಮಾಡಬಹುದು.",
        "health": "ಸೆನ್ಸಾರ್ ಡೇಟಾ ಪ್ರಕಾರ ಸ್ಥಿತಿ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ: ತೇವಾಂಶ {moisture}%, ತಾಪಮಾನ {temp}C, ಆರ್ದ್ರತೆ {humidity}%, pH {ph}. ಎಲೆಯ ಕಲೆ, ಹಳದಿ, ಮಡಚು ಅಥವಾ ಕೀಟ ಪರಿಶೀಲಿಸಿ.",
        "soil": "{location} ಗೆ ಮಣ್ಣು ಪರೀಕ್ಷೆ ವಿಶ್ವಾಸಾರ್ಹ. ಲೋಮಿ ಮಣ್ಣು ಹಲವು ಬೆಳೆಗಳಿಗೆ ಉತ್ತಮ, ಮರಳು ಮಣ್ಣು ಬೇಗ ನೀರು ಬಿಡುತ್ತದೆ, ಮಣ್ಣುಗಡ್ಡೆ ನೀರನ್ನು ಹೆಚ್ಚು ಹಿಡಿದಿಡುತ್ತದೆ.",
        "monsoon": "{location} ನಲ್ಲಿ ಮಳೆ ಮತ್ತು ನೀರು ಹೊರಹೋಗುವಿಕೆಯ ಆಧಾರದಲ್ಲಿ ಬೆಳೆ ಆರಿಸಿ. ತೇವಾಂಶ {moisture}% ಮತ್ತು pH {ph} ಇದ್ದರೆ ಸೋಯಾಬೀನ್, ತೊಗರಿ, ಮೆಕ್ಕೆಜೋಳ ಅಥವಾ ಹೆಸರು ಉತ್ತಮ ಆಯ್ಕೆಗಳು.",
        "default": "{location} ಜಮೀನಿನ ಡೇಟಾ: ತೇವಾಂಶ {moisture}%, ತಾಪಮಾನ {temp}C, ಆರ್ದ್ರತೆ {humidity}%, pH {ph}. ನೀರಾವರಿ, ಗೊಬ್ಬರ, pH, ಬೆಳೆ ಆರೋಗ್ಯ, ಹವಾಮಾನ ಅಥವಾ ಬೆಲೆ ಕೇಳಿ.",
    },
}

app = FastAPI(title="CropConnect ESP32 Ingestion API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://cropconnect01-eq2p.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pump_router)


class TelemetryIn(BaseModel):
    device_id: str = Field(default="sim-node-1", max_length=80)
    soil_moisture: float | None = Field(default=None, ge=0, le=100)
    humidity: float | None = Field(default=None, ge=0, le=100)
    temperature: float | None = Field(default=None, ge=-20, le=80)
    ph: float | None = Field(default=None, ge=0, le=14)
    nitrogen: float | None = Field(default=None, ge=0)
    phosphorus: float | None = Field(default=None, ge=0)
    potassium: float | None = Field(default=None, ge=0)


class EnquiryIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=254)
    phone: str | None = Field(default="", max_length=40)
    organization: str | None = Field(default="", max_length=160)
    message: str = Field(min_length=1, max_length=4000)


class ChatIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    message: str = Field(min_length=1, max_length=2000)
    language: str = Field(default="en", max_length=16)
    input_language: str = Field(default="en", max_length=16)
    sensor_data: dict[str, Any] = Field(default_factory=dict)
    market_data: dict[str, Any] = Field(default_factory=dict)
    weather_data: dict[str, Any] = Field(default_factory=dict)
    location: str | None = Field(default="", max_length=160)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=12)


class AuthSignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default="", max_length=30)
    state: str | None = Field(default="", max_length=120)
    location: str | None = Field(default="", max_length=255)
    land_size: float | None = Field(default=None, ge=0)
    location_type: str | None = Field(default="city", max_length=20)
    city: str | None = Field(default="", max_length=120)
    village: str | None = Field(default="", max_length=120)
    sensor_device_id: str | None = Field(default="sim-node-1", max_length=80)
    sensors: str | None = Field(default="0", max_length=20)
    pumps: str | None = Field(default="0", max_length=20)
    sensor_setup_complete: bool = False
    sensor_setup_status: str | None = Field(default="pending", max_length=40)


class AuthLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class AuthProfileUpdateIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    state: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=255)
    land_size: float | None = Field(default=None, ge=0)
    location_type: str | None = Field(default=None, max_length=20)
    city: str | None = Field(default=None, max_length=120)
    village: str | None = Field(default=None, max_length=120)
    sensor_device_id: str | None = Field(default=None, max_length=80)
    sensors: str | None = Field(default=None, max_length=20)
    pumps: str | None = Field(default=None, max_length=20)
    sensor_setup_complete: bool | None = None
    sensor_setup_status: str | None = Field(default=None, max_length=40)


class PumpStateSaveIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    pump_id: str = Field(min_length=1, max_length=40)
    on: bool
    runtime: int | None = Field(default=0, ge=0)
    schedule: dict[str, Any] = Field(default_factory=dict)
    sent_to_esp32: bool = False
    message: str | None = Field(default="", max_length=255)


class RelayStatusIn(BaseModel):
    device_id: str = Field(default="esp32-relay-1", max_length=80)
    relays: dict[str, bool] = Field(default_factory=dict)


class PumpTimersSaveIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    timers: dict[str, list[dict[str, Any]]] = Field(default_factory=dict)


class ChatMessageSaveIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    message_type: str = Field(min_length=1, max_length=20)
    text: str = Field(min_length=1, max_length=8000)
    related_to_plant_or_soil: bool | None = None
    sensor_data: dict[str, Any] = Field(default_factory=dict)
    location: str | None = Field(default="", max_length=160)


class DashboardSnapshotIn(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    email: str | None = Field(default=None, max_length=255)
    device_id: str | None = Field(default="sim-node-1", max_length=80)
    source: str | None = Field(default="dashboard", max_length=40)
    sensor_data: dict[str, Any] = Field(default_factory=dict)
    pump_data: dict[str, Any] = Field(default_factory=dict)
    timers: dict[str, Any] = Field(default_factory=dict)
    weather_data: dict[str, Any] | None = Field(default=None)
    market_data: dict[str, Any] | None = Field(default=None)
    telemetry_packet: dict[str, Any] = Field(default_factory=dict)


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


def get_server_connection():
    config = {**DB_CONFIG}
    config.pop("database", None)
    return mysql.connector.connect(**config)


def get_farmers_connection(database: str | None = FARMERS_DATABASE):
    config = {**DB_CONFIG, "database": database}
    return mysql.connector.connect(**config)


def add_column_if_missing(cursor, table_schema: str, table_name: str, column_name: str, definition: str) -> None:
    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (table_schema, table_name, column_name),
    )
    row = cursor.fetchone()
    count = row["count"] if isinstance(row, dict) else row[0]
    if not count:
        cursor.execute(f"ALTER TABLE `{table_name}` ADD COLUMN `{column_name}` {definition}")


def ensure_sensor_tables() -> None:
    database = DB_CONFIG["database"]
    with get_server_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.commit()

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sensor_readings (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  device_id VARCHAR(80) NOT NULL,
                  soil_moisture DECIMAL(6,2) NULL,
                  humidity DECIMAL(6,2) NULL,
                  temperature DECIMAL(6,2) NULL,
                  ph DECIMAL(5,2) NULL,
                  nitrogen DECIMAL(8,2) NULL,
                  phosphorus DECIMAL(8,2) NULL,
                  potassium DECIMAL(8,2) NULL,
                  raw_payload JSON NULL,
                  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_device_recorded_at (device_id, recorded_at),
                  INDEX idx_recorded_at (recorded_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS devices (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  device_id VARCHAR(80) NOT NULL UNIQUE,
                  display_name VARCHAR(120) NULL,
                  location VARCHAR(160) NULL,
                  api_key VARCHAR(120) NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS pump_states (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  pump_id VARCHAR(40) NOT NULL,
                  is_on TINYINT(1) NOT NULL DEFAULT 0,
                  runtime_minutes INT UNSIGNED NOT NULL DEFAULT 0,
                  schedule JSON NULL,
                  sent_to_esp32 TINYINT(1) NOT NULL DEFAULT 0,
                  message VARCHAR(255) NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_pump_user_created (user_id, email, created_at),
                  INDEX idx_pump_id_created (pump_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS pump_timers (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  pump_id VARCHAR(40) NOT NULL,
                  timer_key VARCHAR(80) NOT NULL,
                  start_time VARCHAR(10) NOT NULL,
                  duration_minutes INT UNSIGNED NOT NULL,
                  days JSON NULL,
                  active TINYINT(1) NOT NULL DEFAULT 1,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  UNIQUE KEY uq_timer_owner (`user_id`, `email`, `pump_id`, `timer_key`),
                  INDEX idx_timer_owner (user_id, email, pump_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  message_type VARCHAR(20) NOT NULL,
                  text TEXT NOT NULL,
                  related_to_plant_or_soil TINYINT(1) NULL,
                  sensor_data JSON NULL,
                  location VARCHAR(160) NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_chat_owner_created (user_id, email, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS dashboard_snapshots (
                  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                  user_id BIGINT UNSIGNED NULL,
                  email VARCHAR(255) NULL,
                  device_id VARCHAR(80) NULL,
                  source VARCHAR(40) NULL,
                  sensor_data JSON NULL,
                  pump_data JSON NULL,
                  timers JSON NULL,
                  weather_data JSON NULL,
                  market_data JSON NULL,
                  telemetry_packet JSON NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  INDEX idx_snapshot_owner_created (user_id, email, created_at),
                  INDEX idx_snapshot_device_created (device_id, created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """
            )
        conn.commit()


def ensure_farmers_tables() -> None:
    create_db_sql = """
        CREATE DATABASE IF NOT EXISTS `{database}`
          CHARACTER SET utf8mb4
          COLLATE utf8mb4_unicode_ci
    """.format(database=FARMERS_DATABASE)
    create_sign_in_sql = """
        CREATE TABLE IF NOT EXISTS `sign-in` (
          `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          `email` VARCHAR(255) NOT NULL,
          `password` VARCHAR(255) NOT NULL,
          `phone` VARCHAR(30) NULL,
          `name` VARCHAR(120) NULL,
          `state` VARCHAR(120) NULL,
          `location` VARCHAR(255) NULL,
          `land size` DECIMAL(10,2) NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uq_sign_in_email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """

    with get_server_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(create_db_sql)
        conn.commit()

    with get_farmers_connection() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(create_sign_in_sql)
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "location_type", "VARCHAR(20) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "city", "VARCHAR(120) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "village", "VARCHAR(120) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensor_device_id", "VARCHAR(80) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensors", "VARCHAR(20) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "pumps", "VARCHAR(20) NULL")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensor_setup_complete", "TINYINT(1) NOT NULL DEFAULT 0")
            add_column_if_missing(cursor, FARMERS_DATABASE, "sign-in", "sensor_setup_status", "VARCHAR(40) NULL")
        conn.commit()


def user_row_to_payload(row: dict[str, Any]) -> dict[str, Any]:
    location = row.get("location") or ""
    location_type = row.get("location_type") or "city"
    city = row.get("city") or (location if location_type == "city" else "")
    village = row.get("village") or (location if location_type == "village" else "")
    return {
        "id": row["id"],
        "name": row.get("name") or row["email"].split("@")[0],
        "email": row["email"],
        "phone": row.get("phone") or "",
        "state": row.get("state") or "",
        "location": location,
        "locationType": location_type,
        "city": city,
        "village": village,
        "landSize": decimal_to_float(row.get("land size")),
        "sensorDeviceId": row.get("sensor_device_id") or "sim-node-1",
        "sensors": row.get("sensors") or "0",
        "pumps": row.get("pumps") or "0",
        "sensorSetupComplete": bool(row.get("sensor_setup_complete")),
        "sensorSetupStatus": row.get("sensor_setup_status") or "pending",
    }


def check_api_key(x_api_key: str | None) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid ESP32 API key")


def decimal_to_float(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return value


def json_text(value: Any) -> str:
    return json.dumps(value if value is not None else {}, ensure_ascii=False)


def owner_where(user_id: int | None, email: str | None) -> tuple[str, tuple[Any, ...]]:
    if user_id:
        return "user_id = %s", (user_id,)
    if email:
        return "email = %s", (email.strip().lower(),)
    return "email IS NULL AND user_id IS NULL", ()


def parse_json_column(value: Any, fallback: Any) -> Any:
    if value in (None, ""):
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return fallback


def insert_chat_record(
    user_id: int | None,
    email: str | None,
    message_type: str,
    text: str,
    related_to_plant_or_soil: bool | None,
    sensor_data: dict[str, Any] | None,
    location: str | None,
) -> None:
    try:
        ensure_sensor_tables()
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO chat_messages (
                      user_id, email, message_type, text, related_to_plant_or_soil, sensor_data, location
                    )
                    VALUES (%s, %s, %s, %s, %s, CAST(%s AS JSON), %s)
                    """,
                    (
                        user_id,
                        email.strip().lower() if email else None,
                        message_type,
                        text,
                        None if related_to_plant_or_soil is None else (1 if related_to_plant_or_soil else 0),
                        json_text(sensor_data),
                        location or "",
                    ),
                )
            conn.commit()
    except Exception:
        # Chat should still answer even if persistence is temporarily unavailable.
        pass


def request_json(
    url: str,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    verify_ssl: bool = True,
) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST" if payload is not None else "GET",
    )
    context = None if verify_ssl else ssl._create_unverified_context()
    try:
        with urllib.request.urlopen(req, timeout=15, context=context) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.reason
        try:
            body = exc.read().decode("utf-8")
            parsed = json.loads(body)
            detail = parsed.get("error", {}).get("message") or parsed.get("detail") or body
        except Exception:
            pass
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {repr(exc.reason)}") from exc


def send_enquiry_email(payload: EnquiryIn) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_port = int(env("SMTP_PORT", "587"))

    if not smtp_host or not smtp_user or not smtp_password:
        return False

    msg = EmailMessage()
    msg["Subject"] = f"CropConnect Enquiry from {payload.name}"
    msg["From"] = smtp_user
    msg["To"] = CONTACT_TO_EMAIL
    msg["Reply-To"] = payload.email
    msg.set_content(
        "\n".join(
            [
                f"Name: {payload.name}",
                f"Email: {payload.email}",
                f"Phone: {payload.phone or '-'}",
                f"Organization/Farm: {payload.organization or '-'}",
                "",
                "Message:",
                payload.message,
            ]
        )
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(msg)

    return True


def google_search(query: str, location: str | None = "") -> list[dict[str, str]]:
    if not GOOGLE_API_KEY or not GOOGLE_CSE_ID:
        return []

    search_query = f"{query} {location or ''} agriculture farming India".strip()
    url = "https://www.googleapis.com/customsearch/v1?" + urllib.parse.urlencode(
        {
            "key": GOOGLE_API_KEY,
            "cx": GOOGLE_CSE_ID,
            "q": search_query,
            "num": 5,
        }
    )
    try:
        data = request_json(url)
    except Exception:
        return []

    return [
        {
            "title": item.get("title", ""),
            "snippet": item.get("snippet", ""),
            "link": item.get("link", ""),
        }
        for item in data.get("items", [])
    ]


def is_plant_or_soil_question(message: str) -> bool:
    normalized = message.lower()
    normalized = normalized.replace("-", " ")
    words = {word.strip(".,?!:;()[]{}\"'") for word in normalized.split()}

    if words & PLANT_SOIL_TERMS:
        return True

    if any(term in normalized for term in PLANT_SOIL_TERMS if len(term) > 4):
        return True

    return any(term in normalized for term in MULTILINGUAL_PLANT_SOIL_TERMS)


def sensor_value(payload: ChatIn, *keys: str, default: Any = "unknown") -> Any:
    for key in keys:
        value = payload.sensor_data.get(key)
        if value not in (None, ""):
            return value
    return default


def selected_language(payload: ChatIn) -> str:
    code = (payload.language or "en").lower().split("-", 1)[0]
    return code if code in CHAT_REPLY_TEMPLATES else "en"


def localized_chat_reply(payload: ChatIn, reply_key: str) -> str:
    lang = selected_language(payload)
    template = CHAT_REPLY_TEMPLATES.get(lang, CHAT_REPLY_TEMPLATES["en"]).get(
        reply_key,
        CHAT_REPLY_TEMPLATES.get(lang, CHAT_REPLY_TEMPLATES["en"])["default"],
    )
    return template.format(
        moisture=sensor_value(payload, "soilMoisture", "soil_moisture"),
        temp=sensor_value(payload, "temperature"),
        humidity=sensor_value(payload, "humidity"),
        ph=sensor_value(payload, "soilPh", "ph"),
        location=payload.location or "your farm",
    )


def message_has_any(message: str, *terms: str) -> bool:
    return any(term in message for term in terms)


def local_market_reply(payload: ChatIn) -> str:
    prices = payload.market_data.get("prices") if isinstance(payload.market_data, dict) else None
    mandis = payload.market_data.get("mandis") if isinstance(payload.market_data, dict) else None
    location = payload.location or "your area"

    if isinstance(prices, list) and prices:
        price_lines = []
        for crop in prices[:4]:
            if not isinstance(crop, dict):
                continue
            name = crop.get("name") or "Crop"
            price = crop.get("price")
            change = crop.get("change")
            trend = "up" if crop.get("up") else "down"
            if price is not None:
                price_lines.append(f"{name}: Rs {price}/qt ({trend}{'' if change is None else f' {change}%'})")

        mandi_line = ""
        if isinstance(mandis, list) and mandis:
            nearest = [m.get("name") for m in mandis[:2] if isinstance(m, dict) and m.get("name")]
            if nearest:
                mandi_line = " Nearby mandis: " + ", ".join(nearest) + "."

        if price_lines:
            return (
                f"For market decisions near {location}, compare today's dashboard rates first: "
                + "; ".join(price_lines)
                + "."
                + mandi_line
                + " If your crop is ready and the price is above your target, sell part now and hold the rest only if storage quality is safe."
            )

    return localized_chat_reply(payload, "market")


def local_ai_reply(payload: ChatIn) -> str:
    message = payload.message.lower()
    if message_has_any(message, "market", "price", "sell", "rate", "rates", "mandi", "bhav", "bazar", "मंडी", "भाव", "बेच", "बाजार", "ధర", "అమ్మ", "விலை", "விற்க", "দাম", "বিক্রি", "ಬೆಲೆ", "ಮಾರುಕಟ್ಟೆ"):
        return local_market_reply(payload)
    if message_has_any(message, "weather", "rain", "temperature", "forecast", "mausam", "barish", "baarish", "मौसम", "बारिश", "हवामान", "पाऊस", "వాతావరణం", "వర్షం", "வானிலை", "மழை", "আবহাওয়া", "বৃষ্টি", "ಹವಾಮಾನ", "ಮಳೆ"):
        return localized_chat_reply(payload, "weather")
    if message_has_any(message, "irrigat", "water", "watering", "moisture", "pani", "paani", "sinchai", "पानी", "सिंचाई", "पाणी", "सिंचन", "నీరు", "సాగు", "நீர்", "பாசனம்", "সেচ", "ನೀರು", "ನೀರಾವರಿ"):
        return localized_chat_reply(payload, "irrigation")
    if message_has_any(message, "fertilizer", "fertiliser", "npk", "nutrient", "khad", "khaad", "उर्वरक", "खाद", "खत", "ఎరువు", "உரம்", "সার", "ಗೊಬ್ಬರ"):
        return localized_chat_reply(payload, "fertilizer")
    if "ph" in message or "पीएच" in message:
        return localized_chat_reply(payload, "ph")
    if message_has_any(message, "monsoon", "kharif", "crop", "grow", "fasal", "pika", "फसल", "पीक", "పంట", "பயிர்", "ফসল", "ಬೆಳೆ"):
        return localized_chat_reply(payload, "monsoon")
    if message_has_any(message, "health", "disease", "pest", "कीट", "रोग", "आरोग्य", "పురుగు", "రోగ", "நோய்", "পোকা", "রোগ", "ಕೀಟ", "ರೋಗ"):
        return localized_chat_reply(payload, "health")
    if message_has_any(message, "soil type", "soil", "mitti", "mati", "मिट्टी", "माती", "మట్టి", "மண்", "মাটি", "ಮಣ್ಣು"):
        return localized_chat_reply(payload, "soil")
    if message_has_any(message, "irrigat", "water", "watering", "moisture", "pani", "paani", "sinchai", "पानी", "सिंचाई", "पाणी", "सिंचन", "నీరు", "సాగు", "நீர்", "பாசனம்", "সেচ", "ನೀರು", "ನೀರಾವರಿ"):
        return localized_chat_reply(payload, "irrigation")
    if message_has_any(message, "fertilizer", "fertiliser", "npk", "nutrient", "khad", "khaad", "उर्वरक", "खाद", "खत", "ఎరువు", "உரம்", "সার", "ಗೊಬ್ಬರ"):
        return localized_chat_reply(payload, "fertilizer")
    if "ph" in message or "पीएच" in message:
        return localized_chat_reply(payload, "ph")
    if message_has_any(message, "weather", "rain", "temperature", "mausam", "barish", "baarish", "मौसम", "बारिश", "हवामान", "पाऊस", "వాతావరణం", "వర్షం", "வானிலை", "மழை", "আবহাওয়া", "বৃষ্টি", "ಹವಾಮಾನ", "ಮಳೆ"):
        return localized_chat_reply(payload, "weather")
    if message_has_any(message, "market", "price", "sell", "mandi", "bhav", "bazar", "मंडी", "भाव", "बेच", "बाजार", "ధర", "అమ్మ", "விலை", "விற்க", "দাম", "বিক্রি", "ಬೆಲೆ", "ಮಾರುಕಟ್ಟೆ"):
        return localized_chat_reply(payload, "market")

    return localized_chat_reply(payload, "default")


def local_ai_unavailable_reply(payload: ChatIn) -> str:
    moisture = payload.sensor_data.get("soilMoisture") or payload.sensor_data.get("soil_moisture") or "unknown"
    temp = payload.sensor_data.get("temperature") or "unknown"
    humidity = payload.sensor_data.get("humidity") or "unknown"
    return (
        "Live GPT is not connected yet, so I cannot import a fresh answer from GPT or Google Search right now. "
        f"I can still see your farm context: soil moisture {moisture}%, temperature {temp}C, humidity {humidity}%, "
        f"and location {payload.location or 'not set'}. "
        "Set OPENAI_API_KEY for GPT answers, and set GOOGLE_API_KEY plus GOOGLE_CSE_ID to add Google search context."
    )


def reading_to_sensor_list(row: dict[str, Any]) -> list[dict[str, Any]]:
    sensor_meta = [
        ("soil_moisture", "%"),
        ("humidity", "%"),
        ("temperature", "C"),
        ("ph", "pH"),
        ("nitrogen", "mg/kg"),
        ("phosphorus", "mg/kg"),
        ("potassium", "mg/kg"),
    ]

    return [
        {
            "sensor_type": sensor_type,
            "value": decimal_to_float(row[sensor_type]),
            "unit": unit,
            "recorded_at": decimal_to_float(row["recorded_at"]),
            "device_id": row["device_id"],
        }
        for sensor_type, unit in sensor_meta
        if row.get(sensor_type) is not None
    ]


def insert_telemetry_reading(payload: TelemetryIn) -> int:
    ensure_sensor_tables()

    insert_sql = """
        INSERT INTO sensor_readings (
          device_id,
          soil_moisture,
          humidity,
          temperature,
          ph,
          nitrogen,
          phosphorus,
          potassium,
          raw_payload
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CAST(%s AS JSON))
    """

    values = (
        payload.device_id,
        payload.soil_moisture,
        payload.humidity,
        payload.temperature,
        payload.ph,
        payload.nitrogen,
        payload.phosphorus,
        payload.potassium,
        payload.model_dump_json(),
    )

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(insert_sql, values)
            reading_id = cursor.lastrowid
        conn.commit()

    return int(reading_id)


def first_present(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = data.get(key)
        if value not in (None, ""):
            return value
    return None


def esp32_payload_to_telemetry(data: dict[str, Any]) -> TelemetryIn:
    return TelemetryIn(
        device_id=first_present(data, "device_id", "deviceId", "device", "id") or "sim-node-1",
        soil_moisture=first_present(data, "soil_moisture", "soilMoisture", "moisture"),
        humidity=first_present(data, "humidity", "hum"),
        temperature=first_present(data, "temperature", "temp"),
        ph=first_present(data, "ph", "soil_ph", "soilPh"),
        nitrogen=first_present(data, "nitrogen", "n"),
        phosphorus=first_present(data, "phosphorus", "p"),
        potassium=first_present(data, "potassium", "k"),
    )


def sync_relay_commands_from_db() -> None:
    query = """
        SELECT ps.pump_id, ps.is_on
        FROM pump_states ps
        INNER JOIN (
          SELECT pump_id, MAX(id) AS latest_id
          FROM pump_states
          GROUP BY pump_id
        ) latest ON ps.id = latest.latest_id
    """

    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query)
                rows = cursor.fetchall()
    except Exception:
        return

    for row in rows:
        update_relay_command_state(str(row["pump_id"]), bool(row["is_on"]))


@app.get("/api/health")
def health():
    try:
      ensure_sensor_tables()
      ensure_farmers_tables()
      with get_connection() as conn:
          conn.ping(reconnect=True, attempts=1, delay=0)
      return {"ok": True, "database": "connected", "farmers_database": FARMERS_DATABASE}
    except Exception as exc:
      raise HTTPException(status_code=503, detail=f"Database not connected: {exc}") from exc


@app.get("/")
def root():
    return {
        "service": "CropConnect ESP32 Ingestion API",
        "docs": "/docs",
        "health": "/api/health",
        "esp32_relay_command": "/api/esp32/relay-command",
    }


@app.get("/api/esp32/relay-command", response_class=PlainTextResponse)
def esp32_relay_command():
    global RELAY_COMMANDS_LOADED_FROM_DB
    if not RELAY_COMMANDS_LOADED_FROM_DB:
        sync_relay_commands_from_db()
        RELAY_COMMANDS_LOADED_FROM_DB = True
    return relay_command_text()


@app.get("/esp32/relay-command", response_class=PlainTextResponse)
def esp32_relay_command_short():
    return esp32_relay_command()


@app.post("/api/esp32/relay-status")
def esp32_relay_status(payload: RelayStatusIn, x_api_key: str | None = Header(default=None)):
    check_api_key(x_api_key)
    states: dict[int, bool] = {}
    for relay_key, on in payload.relays.items():
        try:
            relay_number = int(relay_key)
        except ValueError:
            continue
        states[relay_number] = bool(on)

    update_relay_applied_state(states)
    return {
        "ok": True,
        "device_id": payload.device_id,
        "status": relay_status_payload(),
    }


@app.get("/api/esp32/relay-status")
def get_esp32_relay_status():
    return {"ok": True, "status": relay_status_payload()}


@app.post("/api/telemetry/ingest")
def ingest_telemetry(payload: TelemetryIn, x_api_key: str | None = Header(default=None)):
    check_api_key(x_api_key)
    reading_id = insert_telemetry_reading(payload)

    return {
        "ok": True,
        "id": reading_id,
        "device_id": payload.device_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/data")
async def receive(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = dict(request.query_params)

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Expected a JSON object")

    payload = esp32_payload_to_telemetry(data)
    insert_telemetry_reading(payload)
    return {"status": "ok"}


@app.get("/api/sensors/latest")
def latest_sensors(device_id: str = Query(default="sim-node-1", max_length=80)):
    ensure_sensor_tables()
    sensor_meta = [
        ("soil_moisture", "%"),
        ("humidity", "%"),
        ("temperature", "C"),
        ("ph", "pH"),
        ("nitrogen", "mg/kg"),
        ("phosphorus", "mg/kg"),
        ("potassium", "mg/kg"),
    ]

    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                readings = []
                latest_recorded_at = None

                for sensor_type, unit in sensor_meta:
                    cursor.execute(
                        f"""
                        SELECT
                          device_id,
                          {sensor_type} AS value,
                          recorded_at
                        FROM sensor_readings
                        WHERE device_id = %s
                          AND {sensor_type} IS NOT NULL
                        ORDER BY recorded_at DESC, id DESC
                        LIMIT 1
                        """,
                        (device_id,),
                    )
                    row = cursor.fetchone()
                    if not row:
                        continue

                    recorded_at = row["recorded_at"]
                    if latest_recorded_at is None or recorded_at > latest_recorded_at:
                        latest_recorded_at = recorded_at

                    readings.append({
                        "sensor_type": sensor_type,
                        "value": decimal_to_float(row["value"]),
                        "unit": unit,
                        "recorded_at": decimal_to_float(recorded_at),
                        "device_id": row["device_id"],
                    })
    except Exception as exc:
        return {
            "device_id": device_id,
            "readings": [],
            "database": "unavailable",
            "message": str(exc),
        }

    if not readings:
        return {"device_id": device_id, "readings": [], "message": "No readings yet"}

    return {
        "device_id": device_id,
        "recorded_at": decimal_to_float(latest_recorded_at),
        "readings": readings,
    }


@app.get("/api/sensors/history")
def sensor_history(
    device_id: str = Query(default="sim-node-1", max_length=80),
    limit: int = Query(default=50, ge=1, le=500),
):
    ensure_sensor_tables()
    query = """
        SELECT
          id,
          device_id,
          soil_moisture,
          humidity,
          temperature,
          ph,
          nitrogen,
          phosphorus,
          potassium,
          recorded_at
        FROM sensor_readings
        WHERE device_id = %s
        ORDER BY recorded_at DESC, id DESC
        LIMIT %s
    """

    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, (device_id, limit))
                rows = cursor.fetchall()
    except Exception as exc:
        return {
            "device_id": device_id,
            "count": 0,
            "items": [],
            "database": "unavailable",
            "message": str(exc),
        }

    return {
        "device_id": device_id,
        "count": len(rows),
        "items": [
            {key: decimal_to_float(value) for key, value in row.items()}
            for row in rows
        ],
    }


@app.post("/api/auth/signup")
def auth_signup(payload: AuthSignupIn):
    ensure_farmers_tables()

    insert_sql = """
        INSERT INTO `sign-in` (
          `email`,
          `password`,
          `phone`,
          `name`,
          `state`,
          `location`,
          `land size`,
          `location_type`,
          `city`,
          `village`,
          `sensor_device_id`,
          `sensors`,
          `pumps`,
          `sensor_setup_complete`,
          `sensor_setup_status`
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    location_type = payload.location_type or "city"
    city = payload.city or (payload.location if location_type == "city" else "")
    village = payload.village or (payload.location if location_type == "village" else "")
    values = (
        payload.email.strip().lower(),
        payload.password,
        payload.phone or "",
        payload.name,
        payload.state or "",
        payload.location or "",
        payload.land_size,
        location_type,
        city or "",
        village or "",
        payload.sensor_device_id or "sim-node-1",
        payload.sensors or "0",
        payload.pumps or "0",
        1 if payload.sensor_setup_complete else 0,
        payload.sensor_setup_status or "pending",
    )

    try:
        with get_farmers_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(insert_sql, values)
                user_id = cursor.lastrowid
                cursor.execute("SELECT * FROM `sign-in` WHERE `id` = %s", (user_id,))
                row = cursor.fetchone()
            conn.commit()
    except mysql.connector.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not create account: {exc}") from exc

    return {
        "ok": True,
        "user": user_row_to_payload(row),
    }


@app.post("/api/auth/login")
def auth_login(payload: AuthLoginIn):
    ensure_farmers_tables()

    query = """
        SELECT
          *
        FROM `sign-in`
        WHERE `email` = %s AND `password` = %s
        LIMIT 1
    """

    try:
        with get_farmers_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, (payload.email.strip().lower(), payload.password))
                row = cursor.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not check login: {exc}") from exc

    if not row:
        raise HTTPException(status_code=401, detail="Email and password do not match")

    return {
        "ok": True,
        "user": user_row_to_payload(row),
    }


@app.post("/api/auth/profile")
def auth_profile_update(payload: AuthProfileUpdateIn):
    ensure_farmers_tables()

    if not payload.user_id and not payload.email:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    updates: list[str] = []
    values: list[Any] = []
    field_map = {
        "name": "name",
        "phone": "phone",
        "state": "state",
        "location": "location",
        "land_size": "land size",
        "location_type": "location_type",
        "city": "city",
        "village": "village",
        "sensor_device_id": "sensor_device_id",
        "sensors": "sensors",
        "pumps": "pumps",
        "sensor_setup_status": "sensor_setup_status",
    }

    data = payload.model_dump(exclude_unset=True)
    for input_name, column_name in field_map.items():
        if input_name in data and data[input_name] is not None:
            updates.append(f"`{column_name}` = %s")
            values.append(data[input_name])

    if "sensor_setup_complete" in data and data["sensor_setup_complete"] is not None:
        updates.append("`sensor_setup_complete` = %s")
        values.append(1 if data["sensor_setup_complete"] else 0)

    if not updates:
        raise HTTPException(status_code=400, detail="No profile fields provided")

    where_sql = "`id` = %s" if payload.user_id else "`email` = %s"
    values.append(payload.user_id or payload.email.strip().lower())

    try:
        with get_farmers_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(f"UPDATE `sign-in` SET {', '.join(updates)} WHERE {where_sql}", tuple(values))
                if cursor.rowcount == 0:
                    raise HTTPException(status_code=404, detail="User not found")
                cursor.execute(
                    "SELECT * FROM `sign-in` WHERE " + where_sql,
                    (payload.user_id or payload.email.strip().lower(),),
                )
                row = cursor.fetchone()
            conn.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not update profile: {exc}") from exc

    return {"ok": True, "user": user_row_to_payload(row)}


@app.post("/api/farm/pump-state")
def save_pump_state(payload: PumpStateSaveIn):
    ensure_sensor_tables()
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO pump_states (
                      user_id, email, pump_id, is_on, runtime_minutes, schedule, sent_to_esp32, message
                    )
                    VALUES (%s, %s, %s, %s, %s, CAST(%s AS JSON), %s, %s)
                    """,
                    (
                        payload.user_id,
                        payload.email.strip().lower() if payload.email else None,
                        payload.pump_id,
                        1 if payload.on else 0,
                        payload.runtime or 0,
                        json_text(payload.schedule),
                        1 if payload.sent_to_esp32 else 0,
                        payload.message or "",
                    ),
                )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save pump state: {exc}") from exc

    update_relay_command_state(payload.pump_id, payload.on)

    return {"ok": True}


@app.get("/api/farm/pump-states")
def get_pump_states(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    query = f"""
        SELECT ps.*
        FROM pump_states ps
        INNER JOIN (
          SELECT pump_id, MAX(id) AS latest_id
          FROM pump_states
          WHERE {where_sql}
          GROUP BY pump_id
        ) latest ON ps.id = latest.latest_id
        ORDER BY ps.pump_id
    """
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(query, values)
                rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load pump states: {exc}") from exc

    return {
        "ok": True,
        "items": [
            {
                "pump_id": row["pump_id"],
                "on": bool(row["is_on"]),
                "runtime": int(row.get("runtime_minutes") or 0),
                "schedule": parse_json_column(row.get("schedule"), {}),
                "sent_to_esp32": bool(row.get("sent_to_esp32")),
                "message": row.get("message") or "",
                "updated_at": decimal_to_float(row.get("created_at")),
            }
            for row in rows
        ],
    }


@app.post("/api/farm/timers")
def save_pump_timers(payload: PumpTimersSaveIn):
    ensure_sensor_tables()
    email = payload.email.strip().lower() if payload.email else None
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                where_sql, values = owner_where(payload.user_id, email)
                cursor.execute(f"DELETE FROM pump_timers WHERE {where_sql}", values)
                for pump_id, timers in payload.timers.items():
                    for timer in timers:
                        cursor.execute(
                            """
                            INSERT INTO pump_timers (
                              user_id, email, pump_id, timer_key, start_time, duration_minutes, days, active
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, CAST(%s AS JSON), %s)
                            """,
                            (
                                payload.user_id,
                                email,
                                str(pump_id),
                                str(timer.get("id") or f"{pump_id}-{timer.get('startTime')}"),
                                str(timer.get("startTime") or ""),
                                int(timer.get("duration") or 0),
                                json_text(timer.get("days") or []),
                                1,
                            ),
                        )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save timers: {exc}") from exc

    return {"ok": True}


@app.get("/api/farm/timers")
def get_pump_timers(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    f"""
                    SELECT *
                    FROM pump_timers
                    WHERE {where_sql} AND active = 1
                    ORDER BY pump_id, start_time
                    """,
                    values,
                )
                rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load timers: {exc}") from exc

    timers: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        timers.setdefault(row["pump_id"], []).append(
            {
                "id": row["timer_key"],
                "startTime": row["start_time"],
                "duration": int(row["duration_minutes"]),
                "days": parse_json_column(row.get("days"), []),
            }
        )

    return {"ok": True, "timers": timers}


@app.post("/api/farm/chat-message")
def save_chat_message(payload: ChatMessageSaveIn):
    ensure_sensor_tables()
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO chat_messages (
                      user_id, email, message_type, text, related_to_plant_or_soil, sensor_data, location
                    )
                    VALUES (%s, %s, %s, %s, %s, CAST(%s AS JSON), %s)
                    """,
                    (
                        payload.user_id,
                        payload.email.strip().lower() if payload.email else None,
                        payload.message_type,
                        payload.text,
                        None if payload.related_to_plant_or_soil is None else (1 if payload.related_to_plant_or_soil else 0),
                        json_text(payload.sensor_data),
                        payload.location or "",
                    ),
                )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save chat message: {exc}") from exc

    return {"ok": True}


@app.get("/api/farm/chat-history")
def get_chat_history(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=50, ge=1, le=200),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    f"""
                    SELECT *
                    FROM chat_messages
                    WHERE {where_sql}
                    ORDER BY id DESC
                    LIMIT %s
                    """,
                    (*values, limit),
                )
                rows = cursor.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load chat history: {exc}") from exc

    return {
        "ok": True,
        "items": [
            {
                "id": row["id"],
                "type": "bot" if row["message_type"] == "bot" else "user",
                "text": row["text"],
                "relatedToPlantOrSoil": None if row.get("related_to_plant_or_soil") is None else bool(row["related_to_plant_or_soil"]),
                "createdAt": decimal_to_float(row.get("created_at")),
            }
            for row in reversed(rows)
        ],
    }


@app.post("/api/farm/snapshot")
def save_dashboard_snapshot(payload: DashboardSnapshotIn):
    ensure_sensor_tables()
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO dashboard_snapshots (
                      user_id, email, device_id, source, sensor_data, pump_data, timers,
                      weather_data, market_data, telemetry_packet
                    )
                    VALUES (%s, %s, %s, %s, CAST(%s AS JSON), CAST(%s AS JSON), CAST(%s AS JSON),
                            CAST(%s AS JSON), CAST(%s AS JSON), CAST(%s AS JSON))
                    """,
                    (
                        payload.user_id,
                        payload.email.strip().lower() if payload.email else None,
                        payload.device_id,
                        payload.source,
                        json_text(payload.sensor_data),
                        json_text(payload.pump_data),
                        json_text(payload.timers),
                        json_text(payload.weather_data),
                        json_text(payload.market_data),
                        json_text(payload.telemetry_packet),
                    ),
                )
            conn.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not save dashboard snapshot: {exc}") from exc

    return {"ok": True}


@app.get("/api/farm/snapshot/latest")
def get_latest_dashboard_snapshot(
    user_id: int | None = Query(default=None, ge=1),
    email: str | None = Query(default=None, max_length=255),
):
    ensure_sensor_tables()
    where_sql, values = owner_where(user_id, email)
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(
                    f"""
                    SELECT *
                    FROM dashboard_snapshots
                    WHERE {where_sql}
                    ORDER BY id DESC
                    LIMIT 1
                    """,
                    values,
                )
                row = cursor.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not load dashboard snapshot: {exc}") from exc

    if not row:
        return {"ok": True, "snapshot": None}

    return {
        "ok": True,
        "snapshot": {
            "id": row["id"],
            "device_id": row.get("device_id"),
            "source": row.get("source"),
            "sensor_data": parse_json_column(row.get("sensor_data"), {}),
            "pump_data": parse_json_column(row.get("pump_data"), {}),
            "timers": parse_json_column(row.get("timers"), {}),
            "weather_data": parse_json_column(row.get("weather_data"), None),
            "market_data": parse_json_column(row.get("market_data"), None),
            "telemetry_packet": parse_json_column(row.get("telemetry_packet"), {}),
            "created_at": decimal_to_float(row.get("created_at")),
        },
    }


@app.post("/api/enquiries")
def enquiries(payload: EnquiryIn):
    sent = False
    try:
        sent = send_enquiry_email(payload)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {exc}") from exc

    return {
        "ok": True,
        "message": "Enquiry received" if sent else "Enquiry received; SMTP delivery is not configured",
        "sent_to": CONTACT_TO_EMAIL,
        "email_sent": sent,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "data": payload.model_dump(),
    }


@app.post("/api/ai/chat")
def ai_chat(payload: ChatIn):
    related_to_plant_or_soil = is_plant_or_soil_question(payload.message)

    context = {
        "location": payload.location,
        "language": payload.language,
        "sensor_data": payload.sensor_data,
        "market_data": payload.market_data,
        "weather_data": payload.weather_data,
    }
    search_results = google_search(payload.message, payload.location)

    if not OPENAI_API_KEY:
        reply = local_ai_reply(payload)
        insert_chat_record(payload.user_id, payload.email, "user", payload.message, True, payload.sensor_data, payload.location)
        insert_chat_record(payload.user_id, payload.email, "bot", reply, True, payload.sensor_data, payload.location)
        return {
            "ok": True,
            "related_to_plant_or_soil": related_to_plant_or_soil,
            "reply": reply,
            "needs_setup": ["OPENAI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_CSE_ID"],
        }

    messages = [
        {
            "role": "developer",
            "content": (
                "You are CropConnect's farming assistant for an IoT farming dashboard. "
                "Your scope is crops, soil, irrigation, sensors, weather, pests/diseases, fertilizer, pumps, and market/mandi decisions. "
                "Always answer the latest user question directly; never repeat or continue an older answer unless the latest question clearly asks for a follow-up. "
                "Give concise, practical guidance with simple language, short paragraphs, and clear next steps. "
                "Prefer 2-5 actionable points over long explanations. Use the supplied farm context, sensor values, market data, and weather data when relevant. "
                "If the question is outside CropConnect's farming purpose, politely redirect it to farming help and offer useful farming topics. "
                "If a question needs certified agronomy, veterinary, legal, medical, or financial advice, say so clearly. "
                "When web search results are supplied, use them as supporting context and mention that the "
                "answer is based on the available search snippets, not direct Google pages. "
                "Always answer in the user's selected language (" + LANGUAGE_NAMES.get(selected_language(payload), payload.language) + ") only. "
                "If the user's spoken or typed message is in another language, understand it, "
                "but reply only in the selected language, not in the input language."
            ),
        },
        {"role": "user", "content": "Current CropConnect dashboard context: " + json.dumps(context, ensure_ascii=False, default=str)},
    ]
    if search_results:
        messages.append(
            {
                "role": "user",
                "content": "Google search context: " + str(search_results),
            }
        )
    if payload.history:
        messages.append(
            {
                "role": "user",
                "content": "Earlier chat history below is context only. Do not answer it unless the latest question asks for a follow-up.",
            }
        )
    for item in payload.history[-4:]:
        role = "assistant" if item.get("type") == "bot" else "user"
        text = item.get("text", "")
        if text:
            messages.append({"role": role, "content": text})
    messages.append({
        "role": "user",
        "content": (
            "Answer this latest question only. Desired reply language: "
            + LANGUAGE_NAMES.get(selected_language(payload), payload.language)
            + ". Input language: "
            + payload.input_language
            + ". Latest question: "
            + payload.message
        ),
    })

    try:
        data = request_json(
            "https://api.openai.com/v1/chat/completions",
            {
                "model": OPENAI_MODEL,
                "messages": messages,
                "temperature": 0.25,
                "max_tokens": 600,
            },
            {"Authorization": f"Bearer {OPENAI_API_KEY}"},
        )
    except Exception as exc:
        reply = local_ai_reply(payload)
        insert_chat_record(payload.user_id, payload.email, "user", payload.message, True, payload.sensor_data, payload.location)
        insert_chat_record(payload.user_id, payload.email, "bot", reply, True, payload.sensor_data, payload.location)
        return {
            "ok": True,
            "related_to_plant_or_soil": related_to_plant_or_soil,
            "reply": reply,
            "needs_setup": ["OPENAI_API_KEY quota/billing"],
            "used_google_search": bool(search_results),
        }

    reply = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    final_reply = reply or "I could not generate a response. Please try again."
    insert_chat_record(payload.user_id, payload.email, "user", payload.message, True, payload.sensor_data, payload.location)
    insert_chat_record(payload.user_id, payload.email, "bot", final_reply, True, payload.sensor_data, payload.location)
    return {
        "ok": True,
        "related_to_plant_or_soil": related_to_plant_or_soil,
        "reply": final_reply,
        "used_google_search": bool(search_results),
    }


@app.get("/api/weather/forecast")
def weather_forecast(location: str = Query(default="Pune, Maharashtra", max_length=160)):
    try:
        # Geocoding using Open-Meteo (free)
        geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
            {"name": location, "count": 1, "language": "en", "format": "json"}
        )
        geo = request_json(geo_url, verify_ssl=False)
        result = (geo.get("results") or [None])[0]
        if not result and "," in location:
            city_name = location.split(",", 1)[0].strip()
            geo_url = "https://geocoding-api.open-meteo.com/v1/search?" + urllib.parse.urlencode(
                {"name": city_name, "count": 1, "language": "en", "format": "json"}
            )
            geo = request_json(geo_url, verify_ssl=False)
            result = (geo.get("results") or [None])[0]
        if not result:
            raise HTTPException(status_code=404, detail="Location not found")

        # Open-Meteo provides live internet forecast data without requiring an API key.
        params = {
            "latitude": result["latitude"],
            "longitude": result["longitude"],
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,pressure_msl,precipitation,weather_code",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
            "forecast_days": 7,
            "timezone": "auto",
        }
        forecast_url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params)
        data = request_json(forecast_url, verify_ssl=False)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Weather request failed: {exc}") from exc

    current = data.get("current", {})
    daily = data.get("daily", {})
    days = daily.get("time", [])
    rain = daily.get("precipitation_probability_max", [])
    rain_amount = daily.get("precipitation_sum", [])
    highs = daily.get("temperature_2m_max", [])
    lows = daily.get("temperature_2m_min", [])

    return {
        "ok": True,
        "source": "Open-Meteo live internet forecast",
        "requested_location": location,
        "location": {
            "name": result.get("name"),
            "admin1": result.get("admin1"),
            "country": result.get("country"),
            "latitude": result.get("latitude"),
            "longitude": result.get("longitude"),
        },
        "temp": round(current.get("temperature_2m", 0)),
        "humidity": round(current.get("relative_humidity_2m", 0)),
        "wind": round(current.get("wind_speed_10m", 0)),
        "pressure": round(current.get("pressure_msl", 0)),
        "rainfall": [
            {
                "day": "Today" if index == 0 else datetime.fromisoformat(day).strftime("%a"),
                "date": day,
                "value": int(rain[index] or 0) if index < len(rain) else 0,
                "mm": round(float(rain_amount[index] or 0), 1) if index < len(rain_amount) else 0,
            }
            for index, day in enumerate(days[:7])
        ],
        "forecast": [
            {
                "day": "Today" if index == 0 else datetime.fromisoformat(day).strftime("%a"),
                "icon": "🌧️" if (rain[index] or 0) >= 50 else "⛅" if (rain[index] or 0) >= 25 else "☀️",
                "high": round(highs[index] or 0),
                "low": round(lows[index] or 0),
            }
            for index, day in enumerate(days)
        ],
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=env("HOST", "0.0.0.0"), port=int(env("PORT", "8001")))
