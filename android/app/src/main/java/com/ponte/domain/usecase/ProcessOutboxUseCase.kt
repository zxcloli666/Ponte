package com.ponte.domain.usecase

import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.remote.ws.WsClient
import com.ponte.data.remote.ws.WsEvent
import org.json.JSONObject
import javax.inject.Inject
import kotlin.math.min

class ProcessOutboxUseCase @Inject constructor(
    private val outboxDao: OutboxDao,
    private val wsClient: WsClient
) {
    suspend operator fun invoke() {
        if (wsClient.connectionState.value != WsClient.ConnectionState.CONNECTED) return

        val pending = outboxDao.getPendingMessages()
        for (message in pending) {
            val event = when (message.eventType) {
                "sms" -> WsEvent.SmsPush(message.payload)
                "call" -> WsEvent.CallLogPush(message.payload)
                "notification" -> WsEvent.NotificationPush(message.payload)
                "contact" -> WsEvent.ContactSync(message.payload)
                else -> continue
            }

            wsClient.emit(event, JSONObject(message.payload)) { ackArgs ->
                // On successful emit, mark as sent
            }
            outboxDao.markSent(message.id)

            // Calculate next retry time with exponential backoff
            val nextRetryDelay = calculateBackoff(message.attempts)
            outboxDao.incrementAttempts(
                id = message.id,
                nextRetryAt = System.currentTimeMillis() + nextRetryDelay
            )
        }
    }

    private fun calculateBackoff(attempts: Int): Long {
        val baseDelay = 1000L
        val maxDelay = 300_000L // 5 minutes
        val delay = baseDelay * (1L shl min(attempts, 18))
        return min(delay, maxDelay)
    }
}
