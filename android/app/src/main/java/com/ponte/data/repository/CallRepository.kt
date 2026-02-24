package com.ponte.data.repository

import android.content.ContentResolver
import android.content.Context
import android.provider.CallLog
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.local.db.dao.SyncStateDao
import com.ponte.data.local.db.entity.OutboxEntity
import com.ponte.data.local.db.entity.SyncStateEntity
import com.ponte.domain.model.Call
import com.ponte.domain.model.CallDirection
import com.ponte.domain.repository.ICallRepository
import com.ponte.domain.usecase.ResolveCallerLineUseCase
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CallRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val outboxDao: OutboxDao,
    private val syncStateDao: SyncStateDao,
    private val simDao: com.ponte.data.local.db.dao.SimDao,
    private val resolveCallerLine: ResolveCallerLineUseCase
) : ICallRepository {

    private val contentResolver: ContentResolver
        get() = context.contentResolver

    override suspend fun readAllFromDevice(): List<Call> {
        return readCalls(selection = null, selectionArgs = null)
    }

    override suspend fun readNewFromDevice(sinceTimestamp: Long): List<Call> {
        return readCalls(
            selection = "${CallLog.Calls.DATE} > ?",
            selectionArgs = arrayOf(sinceTimestamp.toString())
        )
    }

    override suspend fun enqueueForSync(calls: List<Call>) {
        val batchSize = 100
        calls.chunked(batchSize).forEach { batch ->
            val androidId = "call_batch_${batch.first().androidCallId}_${batch.last().androidCallId}"

            // Skip if already queued
            if (outboxDao.findSentByAndroidId(androidId) != null) return@forEach
            if (outboxDao.findPendingByAndroidId(androidId) != null) return@forEach

            val payload = JSONObject().apply {
                put("calls", JSONArray().apply {
                    batch.forEach { call ->
                        put(JSONObject().apply {
                            put("simId", call.simId)
                            call.extraNumberId?.let { put("extraNumberId", it) }
                            put("direction", call.direction.value)
                            put("address", call.address)
                            call.contactId?.let { put("contactId", it) }
                            put("duration", call.duration)
                            put("startedAt", java.time.Instant.ofEpochMilli(call.startedAt).toString())
                            call.endedAt?.let {
                                put("endedAt", java.time.Instant.ofEpochMilli(it).toString())
                            }
                            put("androidCallId", call.androidCallId)
                        })
                    }
                })
            }
            val entity = OutboxEntity(
                eventType = "call",
                payload = payload.toString(),
                androidId = androidId,
                createdAt = System.currentTimeMillis()
            )
            outboxDao.insert(entity)
        }
    }

    override suspend fun getLastSyncTimestamp(): Long? {
        return syncStateDao.getLastSyncedAt(DATA_TYPE)
    }

    override suspend fun updateLastSyncTimestamp(timestamp: Long) {
        syncStateDao.upsert(
            SyncStateEntity(
                dataType = DATA_TYPE,
                lastSyncedAt = timestamp
            )
        )
    }

    @Suppress("DEPRECATION")
    private suspend fun readCalls(selection: String?, selectionArgs: Array<String>?): List<Call> {
        val allSims = simDao.getAll()
        // Default SIM as fallback
        val defaultSimId = allSims.firstOrNull { it.isDefault }?.id ?: allSims.firstOrNull()?.id ?: ""
        // Map ICC ID suffix / phone account ID → backend SIM UUID
        val iccIdMap = allSims.associateBy({ it.iccId }, { it.id })
        val subscriptionMap = allSims.associate { it.subscriptionId to it.id }
        val slotMap = allSims.associate { it.slotIndex to it.id }

        val results = mutableListOf<Call>()
        val projection = arrayOf(
            CallLog.Calls._ID,
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DURATION,
            CallLog.Calls.DATE,
            CallLog.Calls.PHONE_ACCOUNT_ID
        )

        contentResolver.query(
            CallLog.Calls.CONTENT_URI, projection, selection, selectionArgs,
            "${CallLog.Calls.DATE} ASC"
        )?.use { cursor ->
            val idIdx = cursor.getColumnIndexOrThrow(CallLog.Calls._ID)
            val numberIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
            val typeIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.TYPE)
            val durationIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.DURATION)
            val dateIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.DATE)
            val accountIdx = cursor.getColumnIndexOrThrow(CallLog.Calls.PHONE_ACCOUNT_ID)

            while (cursor.moveToNext()) {
                val date = cursor.getLong(dateIdx)
                val duration = cursor.getInt(durationIdx)
                val phoneAccountId = cursor.getString(accountIdx) ?: ""

                // Resolve phone account ID → backend SIM UUID
                // PHONE_ACCOUNT_ID can be: subscription ID, ICC ID suffix, or device-specific string
                val resolvedSimId = phoneAccountId.toIntOrNull()?.let { subscriptionMap[it] }
                    ?: iccIdMap.entries.firstOrNull { phoneAccountId.contains(it.key) }?.value
                    ?: defaultSimId

                val rawNumber = cursor.getString(numberIdx) ?: ""
                val resolution = resolveCallerLine(resolvedSimId, rawNumber)

                results.add(
                    Call(
                        androidCallId = cursor.getString(idIdx),
                        simId = resolvedSimId,
                        extraNumberId = resolution.extraNumber?.id,
                        direction = CallDirection.fromCallLogType(cursor.getInt(typeIdx)),
                        address = resolution.decodedAddress,
                        contactId = null,
                        duration = duration,
                        startedAt = date,
                        endedAt = if (duration > 0) date + duration * 1000L else null
                    )
                )
            }
        }

        return results
    }

    companion object {
        private const val DATA_TYPE = "call"
    }
}
