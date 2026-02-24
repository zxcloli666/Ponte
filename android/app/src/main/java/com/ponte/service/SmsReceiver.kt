package com.ponte.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.local.db.dao.SimDao
import com.ponte.data.local.db.entity.OutboxEntity
import com.ponte.domain.model.MessageDirection
import com.ponte.domain.usecase.ResolveCallerLineUseCase
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject

@AndroidEntryPoint
class SmsReceiver : BroadcastReceiver() {

    @Inject lateinit var outboxDao: OutboxDao
    @Inject lateinit var simDao: SimDao
    @Inject lateinit var resolveCallerLine: ResolveCallerLineUseCase

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val pendingResult = goAsync()

        scope.launch {
            try {
                val subscriptionId = intent.getIntExtra("subscription", -1)
                val sim = if (subscriptionId >= 0) {
                    simDao.getBySubscriptionId(subscriptionId)
                } else null
                // Fall back to first available SIM if mapping fails
                val resolvedSim = sim ?: simDao.getAll().firstOrNull()

                // Group PDUs by sender to concatenate multipart SMS
                val grouped = messages
                    .filter { it.originatingAddress != null }
                    .groupBy { it.originatingAddress!! }

                for ((rawAddress, parts) in grouped) {
                    val simId = resolvedSim?.id ?: continue
                    val fullBody = parts.joinToString("") { it.messageBody ?: "" }
                    val timestamp = parts.first().timestampMillis

                    val resolution = resolveCallerLine(simId, rawAddress)
                    val androidMsgId = "${timestamp}_${rawAddress.hashCode()}"

                    val payload = JSONObject().apply {
                        put("messages", JSONArray().apply {
                            put(JSONObject().apply {
                                put("simId", simId)
                                resolution.extraNumber?.let { put("extraNumberId", it.id) }
                                put("direction", MessageDirection.INCOMING.value)
                                put("address", resolution.decodedAddress)
                                put("body", fullBody)
                                put("androidMsgId", androidMsgId)
                                put("createdAt", java.time.Instant.ofEpochMilli(timestamp).toString())
                            })
                        })
                    }

                    outboxDao.insert(
                        OutboxEntity(
                            eventType = "sms",
                            payload = payload.toString(),
                            androidId = androidMsgId,
                            createdAt = System.currentTimeMillis()
                        )
                    )
                }
            } finally {
                pendingResult.finish()
            }
        }
    }
}
