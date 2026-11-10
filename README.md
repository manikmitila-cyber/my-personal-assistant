# আমার সহকারী (My Personal Assistant)

GitHub দিয়ে APK বানানোর ধাপ (কম্পিউটারে কিছু ইনস্টল লাগবে না):

1. GitHub-এ নতুন repository খুলুন (যেমন `my-personal-assistant`)।
2. এই ফোল্ডারের সব ফাইল (`.github` ফোল্ডারসহ) repository-র মূলে আপলোড/push করুন।
3. repository-র **Actions** ট্যাবে যান → **APK বিল্ড** → **Run workflow**। (`main` এ push করলেও নিজে চলবে।)
4. ১৫–৩০ মিনিট পর বিল্ড শেষে ওই রানের পাতার নিচে **Artifacts → MyPersonalAssistant-apk** ডাউনলোড করুন, zip খুলে `MyPersonalAssistant.apk` ফোনে ইনস্টল করুন ("অজানা উৎস" অনুমতি দিতে হতে পারে)।
5. `typecheck-log` artifact-এ টাইপ-ত্রুটির তালিকা থাকবে; সেটি পাঠালে ত্রুটি ঠিক করে দেওয়া যাবে।

নোট: APK debug কী দিয়ে সাইন হয় (ইনস্টলযোগ্য, Play Store-এর জন্য নয়)। ডিভাইসে কিছুই পরীক্ষিত নয়।

লোকালি চালাতে: `npm install && npx expo install --fix && npx expo start` (ভয়েস/নোটিফিকেশন Expo Go-তে পুরো চলবে না)।
