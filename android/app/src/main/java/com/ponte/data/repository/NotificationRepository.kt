package com.ponte.data.repository

import com.ponte.data.local.db.dao.NotificationFilterDao
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.local.db.entity.NotificationFilterEntity
import com.ponte.data.local.db.entity.OutboxEntity
import com.ponte.domain.model.AppNotification
import com.ponte.domain.repository.INotificationRepository
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor(
    private val outboxDao: OutboxDao,
    private val notificationFilterDao: NotificationFilterDao
) : INotificationRepository {

    override suspend fun enqueueForSync(notification: AppNotification) {
        val payload = JSONObject().apply {
            put("notifications", JSONArray().apply {
                put(JSONObject().apply {
                    put("packageName", notification.packageName)
                    put("appName", notification.appName)
                    put("title", notification.title)
                    put("body", notification.body)
                    put("androidNotifId", notification.androidNotifId)
                    put("postedAt", java.time.Instant.ofEpochMilli(notification.postedAt).toString())
                })
            })
        }
        val entity = OutboxEntity(
            eventType = "notification",
            payload = payload.toString(),
            androidId = notification.androidNotifId,
            createdAt = System.currentTimeMillis()
        )
        outboxDao.insert(entity)
    }

    override suspend fun isPackageEnabled(packageName: String): Boolean {
        return notificationFilterDao.isEnabled(packageName) ?: false
    }

    override suspend fun setPackageEnabled(packageName: String, enabled: Boolean) {
        val existing = notificationFilterDao.getByPackageName(packageName)
        if (existing != null) {
            notificationFilterDao.setEnabled(packageName, enabled)
        } else {
            notificationFilterDao.insert(
                NotificationFilterEntity(
                    id = UUID.randomUUID().toString(),
                    packageName = packageName,
                    enabled = enabled
                )
            )
        }
    }

    override suspend fun getAllFilters(): List<Pair<String, Boolean>> {
        return notificationFilterDao.getAll().map { it.packageName to it.enabled }
    }
}
