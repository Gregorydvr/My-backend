// index.js
const express = require("express");
const fetch = require("node-fetch");
const cron = require("node-cron");

// In a real app, you'd store user data in a database.
// For demo, we'll keep it in memory.
let userPreferences = [];

// Start Express
const app = express();
app.use(express.json());

// 1) Endpoint to receive user preferences from the Expo app
app.post("/schedule", (req, res) => {
  try {
    // The body might look like:
    // {
    //   expoPushToken: "...",
    //   motivationEnabled: true,
    //   screenTimeEnabled: false,
    //   screenTime: 1,
    //   nudgeEnabled: false,
    //   nudgeTime: 1
    // }
    const prefs = req.body;
    console.log("Received new preferences:", prefs);

    // In-memory approach: Check if user is already in array
    const existingIndex = userPreferences.findIndex(
      (u) => u.expoPushToken === prefs.expoPushToken
    );
    if (existingIndex >= 0) {
      // Update existing user’s preferences
      userPreferences[existingIndex] = prefs;
    } else {
      // Add new user
      userPreferences.push(prefs);
    }

    // Return success
    res.json({ success: true });
  } catch (error) {
    console.error("Error in /schedule route:", error);
    res.status(500).json({ success: false, error: error.toString() });
  }
});

// 2) CRON job: check every minute to see if it's time to send push notifications
cron.schedule("* * * * *", async () => {
  // This runs every minute
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Example 1: Check if it's 10:00 or 14:00 to send "Motivation" 
  // (in real code, handle timezones carefully).
  if ((currentHour === 10 && currentMinute === 0) ||
      (currentHour === 14 && currentMinute === 0)) {
    // For each user who has motivationEnabled = true
    for (const user of userPreferences) {
      if (user.motivationEnabled) {
        // Send them a push 
        await sendPushNotification(
          user.expoPushToken,
          "✨ Daily Motivation",
          "This is where you'd include a random quote",
          true // vibration
        );
      }
    }
  }

  // Example 2: If "screenTimeEnabled" is on, we might track each user’s usage
  // Actually tracking hours of usage is tricky. Typically, your app would
  // send periodic "check-ins" to the server with how many hours used. 
  // Then you'd do logic here. For simplicity, let's just show how you'd do "every X hours":
  // This is naive logic: you’d store the lastSentTime in DB for each user, check difference, etc.

  // Example 3: For "A Nudge" from 09:00 to 19:00 every nudgeTime hours,
  // you'd do something similar. Keep last time you sent a nudge for each user, 
  // compare to the user’s nudgeTime, if enough time has passed and it's between 09:00 and 19:00,
  // send a push with no vibration.

  // Example 4: If it's 09:00, send "It's a new day to not go on your phone"
  // if the user has "nudgeEnabled" turned on (and we haven't already sent it this day).
  if (currentHour === 9 && currentMinute === 0) {
    for (const user of userPreferences) {
      if (user.nudgeEnabled) {
        // No vibration
        await sendPushNotification(
          user.expoPushToken,
          "🕘 It's a new day!",
          "It's a new day to not go on your phone",
          false
        );
      }
    }
  }

  // etc. for the rest of your scheduling logic
});

// 3) Helper function to actually send a push via Expo
async function sendPushNotification(expoPushToken, title, body, vibrate) {
  try {
    // If vibrate is true, use "default" sound, which triggers vibration
    const soundSetting = vibrate ? "default" : undefined;
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: soundSetting,
        title,
        body,
        data: { extra: "info" },
      }),
    });
    const result = await response.json();
    console.log("Push response:", result);
  } catch (error) {
    console.error("Error sending push:", error);
  }
}

// Finally, start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
