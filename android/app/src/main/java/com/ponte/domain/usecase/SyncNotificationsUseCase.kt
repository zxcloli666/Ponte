package com.ponte.domain.usecase

import com.ponte.domain.model.AppNotification
import com.ponte.domain.repository.INotificationRepository
import javax.inject.Inject

class SyncNotificationsUseCase @Inject constructor(
    private val notificationRepository: INotificationRepository
) {
    suspend operator fun invoke(notification: AppNotification): Boolean {
        val enabled = notificationRepository.isPackageEnabled(notification.packageName)
        if (!enabled) return false
        notificationRepository.enqueueForSync(notification)
        return true
    }
}
