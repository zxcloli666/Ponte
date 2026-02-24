package com.ponte.domain.repository

import com.ponte.domain.model.Call

interface ICallRepository {
    suspend fun readAllFromDevice(): List<Call>
    suspend fun readNewFromDevice(sinceTimestamp: Long): List<Call>
    suspend fun enqueueForSync(calls: List<Call>)
    suspend fun getLastSyncTimestamp(): Long?
    suspend fun updateLastSyncTimestamp(timestamp: Long)
}
