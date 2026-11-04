# GPay Tracker

## Backend (backend/)
    cd backend
    npm install
    DEVICE_KEY=your-long-random-secret VIEW_KEY=mom-password npm start

Deploy this folder to Render or Railway (Node service, start command `npm start`),
setting DEVICE_KEY and VIEW_KEY as environment variables.

## Android (android/)
1. Open the `android` folder in Android Studio (File > Open). Let it sync Gradle.
2. In `app/src/main/java/com/example/gpaytracker/PaymentListener.kt`, set
   SERVER_URL to your deployed address and DEVICE_KEY to the same value as on the server.
3. Run the app on your father's phone.
4. Open the app and tap "Open notification access settings". Turn on GPay Tracker
   together with him, and explain what it reads.
