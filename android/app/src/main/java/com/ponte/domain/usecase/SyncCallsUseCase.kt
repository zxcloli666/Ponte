package com.ponte.domain.usecase

import com.ponte.domain.repository.ICallRepository
import javax.inject.Inject

class SyncCallsUseCase @Inject constructor(
    private val callRepository: ICallRepository
) {
    suspend operator fun invoke(fullSync: Boolean = false) {
        val lastTimestamp = callRepository.getLastSyncTimestamp()

        val calls = if (fullSync || lastTimestamp == null) {
            callRepository.readAllFromDevice()
        } else {
            callRepository.readNewFromDevice(lastTimestamp)
        }

        if (calls.isNotEmpty()) {
            callRepository.enqueueForSync(calls)
            val maxTimestamp = calls.maxOf { it.startedAt }
            callRepository.updateLastSyncTimestamp(maxTimestamp)
        }
    }
}
