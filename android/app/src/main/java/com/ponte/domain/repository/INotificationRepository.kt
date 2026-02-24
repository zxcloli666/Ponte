package com.ponte.domain.repository

import com.ponte.domain.model.AppNotification

interface INotificationRepository {
    suspend fun enqueueForSync(notification: AppNotification)
    suspend fun isPackageEnabled(packageName: String): Boolean
    suspend fun setPackageEnabled(packageName: String, enabled: Boolean)
    suspend fun getAllFilters(): List<Pair<String, Boolean>>
}
