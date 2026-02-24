package com.ponte.domain.repository

import com.ponte.domain.model.Contact

interface IContactRepository {
    suspend fun readAllFromDevice(): List<Contact>
    suspend fun readChangedFromDevice(sinceTimestamp: Long): List<Contact>
    suspend fun enqueueForSync(contacts: List<Contact>)
    suspend fun getLastSyncTimestamp(): Long?
    suspend fun updateLastSyncTimestamp(timestamp: Long)
}
