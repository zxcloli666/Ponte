package com.ponte.domain.usecase

import com.ponte.domain.repository.ISmsRepository
import javax.inject.Inject

class SyncSmsUseCase @Inject constructor(
    private val smsRepository: ISmsRepository
) {
    suspend operator fun invoke(fullSync: Boolean = false) {
        val lastTimestamp = smsRepository.getLastSyncTimestamp()

        val messages = if (fullSync || lastTimestamp == null) {
            smsRepository.readAllFromDevice()
        } else {
            smsRepository.readNewFromDevice(lastTimestamp)
        }

        if (messages.isNotEmpty()) {
            smsRepository.enqueueForSync(messages)
            val maxTimestamp = messages.maxOf { it.createdAt }
            smsRepository.updateLastSyncTimestamp(maxTimestamp)
        }
    }
}
