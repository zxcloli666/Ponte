package com.ponte.data.repository

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.Telephony
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.local.db.dao.SyncStateDao
import com.ponte.data.local.db.entity.OutboxEntity
import com.ponte.data.local.db.entity.SyncStateEntity
import com.ponte.domain.model.MessageDirection
import com.ponte.domain.model.Sms
import com.ponte.domain.repository.ISmsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SmsRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val outboxDao: OutboxDao,
    private val syncStateDao: SyncStateDao,
    private val simDao: com.ponte.data.local.db.dao.SimDao
) : ISmsRepository {

    private val contentResolver: ContentResolver
        get() = context.contentResolver

    override suspend fun readAllFromDevice(): List<Sms> {
        return readSms(selection = null, selectionArgs = null)
    }

    override suspend fun readNewFromDevice(sinceTimestamp: Long): List<Sms> {
        return readSms(
            selection = "${Telephony.Sms.DATE} > ?",
            selectionArgs = arrayOf(sinceTimestamp.toString())
        )
    }

    override suspend fun enqueueForSync(messages: List<Sms>) {
        val batchSize = 100
        messages.chunked(batchSize).forEach { batch ->
            val androidId = "sms_batch_${batch.first().androidMsgId}_${batch.last().androidMsgId}"

            // Skip if this batch is already in the outbox (not yet acked)
            if (outboxDao.findSentByAndroidId(androidId) != null) return@forEach
            if (outboxDao.findPendingByAndroidId(androidId) != null) return@forEach

            val payload = JSONObject().apply {
                put("messages", JSONArray().apply {
                    batch.forEach { sms ->
                        put(JSONObject().apply {
                            put("simId", sms.simId)
                            sms.extraNumberId?.let { put("extraNumberId", it) }
                            put("direction", sms.direction.value)
                            put("address", sms.address)
                            sms.contactId?.let { put("contactId", it) }
                            put("body", sms.body)
                            put("androidMsgId", sms.androidMsgId)
                            put("createdAt", java.time.Instant.ofEpochMilli(sms.createdAt).toString())
                        })
                    }
                })
            }
            val entity = OutboxEntity(
                eventType = "sms",
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

    private suspend fun readSms(selection: String?, selectionArgs: Array<String>?): List<Sms> {
        // Build subscription ID → backend SIM UUID map
        val simMap = buildSimSubscriptionMap()

        val results = mutableListOf<Sms>()
        val uri: Uri = Telephony.Sms.CONTENT_URI
        val projection = arrayOf(
            Telephony.Sms._ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.TYPE,
            Telephony.Sms.SUBSCRIPTION_ID
        )

        contentResolver.query(
            uri, projection, selection, selectionArgs,
            "${Telephony.Sms.DATE} ASC"
        )?.use { cursor ->
            val idIdx = cursor.getColumnIndexOrThrow(Telephony.Sms._ID)
            val addressIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
            val bodyIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
            val dateIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
            val typeIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.TYPE)
            val subIdIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.SUBSCRIPTION_ID)

            while (cursor.moveToNext()) {
                val subscriptionId = cursor.getInt(subIdIdx)
                val backendSimId = simMap[subscriptionId] ?: continue

                results.add(
                    Sms(
                        androidMsgId = cursor.getString(idIdx),
                        simId = backendSimId,
                        extraNumberId = null,
                        direction = MessageDirection.fromSmsType(cursor.getInt(typeIdx)),
                        address = cursor.getString(addressIdx) ?: "",
                        contactId = null,
                        body = cursor.getString(bodyIdx) ?: "",
                        createdAt = cursor.getLong(dateIdx)
                    )
                )
            }
        }

        return results
    }

    private suspend fun buildSimSubscriptionMap(): Map<Int, String> {
        return simDao.getAll().associate { it.subscriptionId to it.id }
    }

    companion object {
        private const val DATA_TYPE = "sms"
    }
}
