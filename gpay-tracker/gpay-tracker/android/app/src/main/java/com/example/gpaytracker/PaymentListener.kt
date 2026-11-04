package com.example.gpaytracker

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.time.Instant

class PaymentListener : NotificationListenerService() {

    companion object {
        // CHANGE THESE TWO VALUES
        private const val SERVER_URL = "https://YOUR-APP.onrender.com/api/ingest"
        private const val DEVICE_KEY = "bharani2845"

        private const val GPAY_PACKAGE = "com.google.android.apps.nbu.paisa.user"
    }

    private val client = OkHttpClient()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName != GPAY_PACKAGE) return

        val extras = sbn.notification.extras
        val text = listOf("android.title", "android.text", "android.bigText")
            .mapNotNull { extras.getCharSequence(it)?.toString() }
            .joinToString(" ")
        if (text.isBlank()) return

        val body = JSONObject()
            .put("text", text)
            .put("postedAt", Instant.ofEpochMilli(sbn.postTime).toString())
            .toString()

        Thread {
            try {
                val request = Request.Builder()
                    .url(SERVER_URL)
                    .header("x-device-key", DEVICE_KEY)
                    .post(body.toRequestBody("application/json".toMediaType()))
                    .build()
                client.newCall(request).execute().close()
            } catch (_: Exception) {
                // Network failed; this notification is not retried.
            }
        }.start()
    }
}
