# Troubleshooting Guide: AI Itinerary Generation Failed

## Issue Diagnosed

All Gemini API model names are returning "Not Found" errors, which indicates one of the following:

## Possible Causes & Solutions

### 1. **API Key Validity** ⚠️ MOST LIKELY

**Problem**: The API key may be invalid, expired, or not properly enabled.

**Solution**:
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. **Delete the old API key** if it exists
4. **Create a NEW API key**
5. Copy the new key
6. Replace the key in your `.env` file:
   ```
   VITE_GEMINI_API_KEY=your_new_key_here
   ```
7. Make sure there are NO spaces, quotes, or extra characters
8. Restart the dev server (`Ctrl+C`, then `npm run dev`)

### 2. **API Access Not Enabled**

**Problem**: The Gemini API might not be enabled for your Google Cloud project.

**Solution**:
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Accept the terms of service if prompted
3. Ensure you're in a supported region (Gemini API is not available in all countries)
4. Check if there are any usage restrictions on your account

### 3. **Network/Firewall Issues**

**Problem**: Your network, firewall, or antivirus might be blocking API requests.

**Solution**:
- Try disabling your antivirus/firewall temporarily
- Check if you're behind a proxy or VPN
- Try using a different network connection
- Check Windows Firewall settings

### 4. **Region Restrictions**

**Problem**: Gemini API might not be available in your region.

**Solution**:
Visit [this page](https://ai.google.dev/available_regions) to check if Gemini is available in your country. If not, you may need to use a VPN or alternative AI service.

---

## Quick Fix: Test Your API Key

Run this command to test if your API key is valid:

```bash
node test-models.js
```

If you see ✅ next to any model name, your API is working!

If you see ❌ for all models, your API key needs to be regenerated.

---

## Alternative: Use Demo Mode (Automatic)

I've updated the app to automatically switch to **Demo Mode** if the API fails.

**How it works**:
1. Fill out the form normally
2. If the API key is invalid or quota exceeded, the app will **automatically** generate a realistic sample itinerary
3. You'll see a yellow "Demo Mode" banner at the top of the results
4. The map, budget calculations, and all other features work exactly the same!

This means you can test the entire application flow right now, even without a valid API key.

---

## Getting a New API Key (Step-by-Step)

1. **Open**: https://aistudio.google.com/apikey
2. **Sign in** with your Google account
3. Click **"Create API key"**
4. Select **"Create API key in new project"** (or select an existing project)
5. **Copy** the key immediately (you won't be able to see it again!)
6. **Paste** it in your `.env` file:
   ```
   VITE_GEMINI_API_KEY=AIza...your...key...here
   ```
7. **Save** the file
8. **Restart** your dev server

---

## Still Not Working?

**Check the Browser Console**:
1. Open your browser (Chrome/Firefox/Edge)
2. Go to http://localhost:5173
3. Press `F12` to open Developer Tools
4. Click the "Console" tab
5. Try generating an itinerary
6. Look for error messages in red
7. Share the error message for further help

**Common Error Messages**:
- `API key expired` → The key was revoked or expired. Get a new one!
- `API key not valid` → Key has typos or was deleted. Get a new one!
- `quota exceeded` → Wait 24 hours or upgrade your account
- `network error` → Check your internet connection
- `CORS error` → Try restarting the dev server

---

## Contact Support

If none of these solutions work, the issue might be with Google's API service. Check:
- [Google AI Studio Status](https://status.cloud.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

## Last Resort: Use Mock Data

If you can't get the API working, I can modify the app to use sample/mock itineraries for demonstration purposes. Let me know if you'd like me to do that!
