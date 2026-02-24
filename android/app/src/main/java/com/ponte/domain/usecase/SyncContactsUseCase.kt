package com.ponte.domain.usecase

import com.ponte.domain.repository.IContactRepository
import javax.inject.Inject

class SyncContactsUseCase @Inject constructor(
    private val contactRepository: IContactRepository
) {
    suspend operator fun invoke(fullSync: Boolean = false) {
        val lastTimestamp = contactRepository.getLastSyncTimestamp()

        val contacts = if (fullSync || lastTimestamp == null) {
            contactRepository.readAllFromDevice()
        } else {
            contactRepository.readChangedFromDevice(lastTimestamp)
        }

        if (contacts.isNotEmpty()) {
            contactRepository.enqueueForSync(contacts)
            val maxTimestamp = contacts.maxOf { it.updatedAt }
            contactRepository.updateLastSyncTimestamp(maxTimestamp)
        }
    }
}
