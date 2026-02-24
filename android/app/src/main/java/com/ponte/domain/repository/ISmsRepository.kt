package com.ponte.domain.repository

import com.ponte.domain.model.Sms

interface ISmsRepository {
    suspend fun readAllFromDevice(): List<Sms>
    suspend fun readNewFromDevice(sinceTimestamp: Long): List<Sms>
    suspend fun enqueueForSync(messages: List<Sms>)
    suspend fun getLastSyncTimestamp(): Long?
    suspend fun updateLastSyncTimestamp(timestamp: Long)
}
