package com.ponte

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class PonteApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        val manager = getSystemService(NotificationManager::class.java)

        val syncChannel = NotificationChannel(
            CHANNEL_SYNC,
            "Sync Service",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Persistent notification for background sync"
            setShowBadge(false)
        }

        val alertChannel = NotificationChannel(
            CHANNEL_ALERTS,
            "Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Important alerts and errors"
        }

        manager.createNotificationChannels(listOf(syncChannel, alertChannel))
    }

    companion object {
        const val CHANNEL_SYNC = "ponte_sync"
        const val CHANNEL_ALERTS = "ponte_alerts"
    }
}
