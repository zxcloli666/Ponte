package com.ponte.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.IBinder
import android.telecom.TelecomManager
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import com.ponte.PonteApp
import com.ponte.R
import com.ponte.data.remote.ws.WsClient
import com.ponte.data.remote.ws.WsEvent
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.domain.usecase.ProcessOutboxUseCase
import com.ponte.domain.usecase.SyncCallsUseCase
import com.ponte.domain.usecase.SyncContactsUseCase
import com.ponte.domain.usecase.SyncSmsUseCase
import com.ponte.domain.repository.IAuthRepository
import com.ponte.domain.repository.ISimRepository
import com.ponte.ui.MainActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject

@AndroidEntryPoint
class SyncForegroundService : Service() {

    @Inject lateinit var wsClient: WsClient
    @Inject lateinit var processOutboxUseCase: ProcessOutboxUseCase
    @Inject lateinit var syncSmsUseCase: SyncSmsUseCase
    @Inject lateinit var syncCallsUseCase: SyncCallsUseCase
    @Inject lateinit var syncContactsUseCase: SyncContactsUseCase
    @Inject lateinit var simRepository: ISimRepository
    @Inject lateinit var authRepository: IAuthRepository
    @Inject lateinit var outboxDao: OutboxDao
    @Inject lateinit var simDao: com.ponte.data.local.db.dao.SimDao

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var initialSyncDone = false

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification("Connecting..."))

        // Initialize CallManager so it can report call states even before InCallService binds
        CallManager.wsClient = wsClient
        CallManager.simDao = simDao
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startSync()
            ACTION_STOP -> {
                wsClient.disconnect()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun startSync() {
        wsClient.connect()

        serviceScope.launch {
            wsClient.connectionState.collectLatest { state ->
                val text = when (state) {
                    WsClient.ConnectionState.CONNECTED -> "Sync active"
                    WsClient.ConnectionState.RECONNECTING -> "Reconnecting..."
                    WsClient.ConnectionState.DISCONNECTED -> "Disconnected"
                }
                updateNotification(text)
            }
        }

        serviceScope.launch {
            wsClient.events.collect { event ->
                when (event) {
                    is WsEvent.Connected -> {
                        if (!initialSyncDone) {
                            runInitialSync()
                            initialSyncDone = true
                        }
                        processOutboxUseCase()
                    }
                    is WsEvent.Ack -> handleAck(event)
                    is WsEvent.TokenExpired -> handleTokenExpired()
                    is WsEvent.SmsSend -> handleSmsSend(event.payload)
                    is WsEvent.CallInitiate -> handleCallInitiate(event.payload)
                    is WsEvent.CallAccept -> handleCallAccept()
                    is WsEvent.CallReject -> handleCallReject()
                    is WsEvent.CallEnd -> handleCallEnd()
                    else -> { /* lifecycle events */ }
                }
            }
        }

        // Watch outbox for new pending messages and process them immediately
        serviceScope.launch {
            outboxDao.observePendingCount().collectLatest { count ->
                if (count > 0 && wsClient.connectionState.value == WsClient.ConnectionState.CONNECTED) {
                    processOutboxUseCase()
                }
            }
        }

        // Periodic cleanup of acked messages + retry stale "sent" items
        serviceScope.launch {
            while (true) {
                delay(30_000) // every 30 seconds
                try {
                    // Clean up fully acked messages
                    outboxDao.deleteAcked()
                    // Reset stale "sent" items (no ack after 30s) back to pending for retry
                    outboxDao.resetStaleSent(System.currentTimeMillis() - 30_000)
                } catch (e: Exception) {
                    android.util.Log.e("SyncService", "Outbox maintenance failed", e)
                }
            }
        }
    }

    /**
     * Run full initial sync of all device data.
     * SIMs are synced via REST, everything else goes through outbox → WS.
     */
    private suspend fun runInitialSync() {
        try {
            // Sync SIMs first (REST)
            val sims = simRepository.readSimsFromDevice()
            if (sims.isNotEmpty()) {
                simRepository.syncSimsToBackend(sims)
            }

            // Sync SMS, calls, contacts (full only on first-ever sync, incremental after)
            syncSmsUseCase()
            syncCallsUseCase()
            syncContactsUseCase()

            // Process the outbox immediately
            processOutboxUseCase()
        } catch (e: Exception) {
            android.util.Log.e("SyncService", "Initial sync failed", e)
        }
    }

    private suspend fun handleAck(event: WsEvent.Ack) {
        outboxDao.markAcked(event.androidId)
        android.util.Log.d("SyncService", "Acked outbox item: ${event.androidId} (${event.eventType})")
    }

    @Suppress("MissingPermission")
    private fun handleSmsSend(payload: String) {
        try {
            val json = JSONObject(payload)
            val address = json.getString("address")
            val body = json.getString("body")
            val subscriptionId = json.optInt("subscriptionId", -1)

            val smsManager = if (subscriptionId > 0) {
                SmsManager.getSmsManagerForSubscriptionId(subscriptionId)
            } else {
                SmsManager.getDefault()
            }

            val parts = smsManager.divideMessage(body)
            if (parts.size == 1) {
                smsManager.sendTextMessage(address, null, body, null, null)
            } else {
                smsManager.sendMultipartTextMessage(address, null, parts, null, null)
            }
            android.util.Log.i("SyncService", "SMS sent to $address")
        } catch (e: Exception) {
            android.util.Log.e("SyncService", "Failed to send SMS", e)
        }
    }

    @Suppress("MissingPermission")
    private fun handleCallInitiate(payload: String) {
        try {
            val json = JSONObject(payload)
            val callId = json.getString("callId")
            val to = json.getString("to")
            val simId = json.optString("simId", "")
            val extraNumberId = json.optString("extraNumberId", "")

            // Save callId so InCallService/CallManager can associate this call
            ActiveCallState.set(callId, webInitiated = true)

            // Use TelecomManager.placeCall for silent call placement
            val tm = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val uri = Uri.parse("tel:$to")
            val extras = android.os.Bundle()

            // Route to the correct SIM subscription if specified
            if (simId.isNotEmpty()) {
                serviceScope.launch {
                    try {
                        val sim = simDao.getById(simId)
                        if (sim != null && sim.subscriptionId > 0) {
                            val phoneAccountHandle = tm.callCapablePhoneAccounts.firstOrNull { account ->
                                account.id == sim.subscriptionId.toString() || account.id.contains(sim.iccId)
                            }
                            if (phoneAccountHandle != null) {
                                extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, phoneAccountHandle)
                            }
                        }
                        tm.placeCall(uri, extras)
                        android.util.Log.i("SyncService", "Call initiated to $to (callId=$callId, simId=$simId, extraNumberId=$extraNumberId)")
                    } catch (e: Exception) {
                        android.util.Log.e("SyncService", "Failed to initiate call with SIM routing", e)
                    }
                }
            } else {
                tm.placeCall(uri, extras)
                android.util.Log.i("SyncService", "Call initiated to $to (callId=$callId)")
            }
        } catch (e: Exception) {
            android.util.Log.e("SyncService", "Failed to initiate call", e)
        }
    }

    private fun handleCallAccept() {
        try {
            CallManager.answer()
            android.util.Log.i("SyncService", "Call accepted via CallManager")
        } catch (e: Exception) {
            android.util.Log.e("SyncService", "Failed to accept call", e)
        }
    }

    private fun handleCallReject() {
        try {
            CallManager.reject()
            android.util.Log.i("SyncService", "Call rejected via CallManager")
        } catch (e: Exception) {
            android.util.Log.e("SyncService", "Failed to reject call", e)
        }
    }

    private fun handleCallEnd() {
        try {
            CallManager.disconnect()
            android.util.Log.i("SyncService", "Call ended via CallManager")
        } catch (e: Exception) {
            android.util.Log.e("SyncService", "Failed to end call", e)
        }
    }

    private fun handleTokenExpired() {
        serviceScope.launch {
            var attempt = 0
            val maxAttempts = 5
            while (attempt < maxAttempts) {
                val result = authRepository.refreshTokens()
                if (result.isSuccess) {
                    android.util.Log.i("SyncService", "Token refreshed, reconnecting WebSocket")
                    wsClient.connect()
                    return@launch
                }
                attempt++
                val backoff = 1000L * (1L shl attempt.coerceAtMost(4))
                android.util.Log.w("SyncService", "Token refresh failed (attempt $attempt/$maxAttempts), retrying in ${backoff}ms", result.exceptionOrNull())
                delay(backoff)
            }
            android.util.Log.e("SyncService", "Token refresh exhausted after $maxAttempts attempts")
            updateNotification("Auth failed — open app to re-pair")
        }
    }

    private fun createNotification(text: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, PonteApp.CHANNEL_SYNC)
            .setContentTitle("Ponte")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_sync)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification(text: String) {
        val notification = createNotification(text)
        val manager = getSystemService(android.app.NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        serviceScope.cancel()
        wsClient.disconnect()
        super.onDestroy()
    }

    companion object {
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.ponte.action.START_SYNC"
        const val ACTION_STOP = "com.ponte.action.STOP_SYNC"

        fun start(context: Context) {
            val intent = Intent(context, SyncForegroundService::class.java).apply {
                action = ACTION_START
            }
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            val intent = Intent(context, SyncForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}
