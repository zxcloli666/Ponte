package com.ponte.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.ponte.domain.model.AppNotification
import com.ponte.domain.usecase.SyncNotificationsUseCase
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class NotificationListener : NotificationListenerService() {

    @Inject lateinit var syncNotificationsUseCase: SyncNotificationsUseCase

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return // skip own notifications

        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val appName = getAppLabel(sbn.packageName)

        val notification = AppNotification(
            androidNotifId = "${sbn.packageName}_${sbn.id}_${sbn.postTime}",
            packageName = sbn.packageName,
            appName = appName,
            title = title,
            body = text,
            postedAt = sbn.postTime
        )

        serviceScope.launch {
            syncNotificationsUseCase(notification)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Not needed for forwarding
    }

    private fun getAppLabel(packageName: String): String {
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            packageName
        }
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }
}
