package com.ponte.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telecom.TelecomManager
import android.telephony.TelephonyManager
import com.ponte.data.local.db.dao.SimDao
import com.ponte.data.remote.ws.WsClient
import com.ponte.domain.usecase.ResolveCallerLineUseCase
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID
import javax.inject.Inject

/**
 * Fallback call state receiver — only active when Ponte is NOT the default dialer.
 * When Ponte IS the default dialer, PonteInCallService handles everything.
 */
@AndroidEntryPoint
class CallStateReceiver : BroadcastReceiver() {

    @Inject lateinit var wsClient: WsClient
    @Inject lateinit var simDao: SimDao
    @Inject lateinit var resolveCallerLine: ResolveCallerLineUseCase

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    @Suppress("MissingPermission")
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        // If Ponte is the default dialer, InCallService handles everything — skip
        val tm = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        if (tm.defaultDialerPackage == context.packageName) {
            android.util.Log.d("CallStateReceiver", "Ponte is default dialer, InCallService handles calls")
            return
        }

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        android.util.Log.d("CallStateReceiver", "State: $state, number: $number, activeCallId: ${ActiveCallState.callId}")

        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                // Incoming call — only report if NOT web-initiated (web-initiated goes IDLE→OFFHOOK, not RINGING)
                number?.let { incomingNumber ->
                    scope.launch {
                        try {
                            val sims = simDao.getAll()
                            val sim = sims.firstOrNull { it.isDefault } ?: sims.firstOrNull()
                            if (sim == null) {
                                android.util.Log.w("CallStateReceiver", "No SIM found")
                                return@launch
                            }

                            val callId = UUID.randomUUID().toString()
                            ActiveCallState.set(callId, webInitiated = false)

                            val resolution = resolveCallerLine(sim.id, incomingNumber)
                            val payload = JSONObject().apply {
                                put("callId", callId)
                                put("from", resolution.decodedAddress)
                                put("simId", sim.id)
                                resolution.extraNumber?.let { put("extraNumberId", it.id) }
                            }
                            wsClient.emit("call:incoming", payload)
                            android.util.Log.i("CallStateReceiver", "Incoming call: ${resolution.decodedAddress} (callId=$callId, extraNumber=${resolution.extraNumber?.id})")
                        } catch (e: Exception) {
                            android.util.Log.e("CallStateReceiver", "Failed to report incoming call", e)
                        }
                    }
                }
            }

            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                // Call answered or outgoing call connected
                val callId = ActiveCallState.callId ?: return
                scope.launch {
                    try {
                        val payload = JSONObject().apply {
                            put("callId", callId)
                            put("status", "active")
                        }
                        // Use a custom event that backend understands
                        // For web-initiated calls, backend already has activeCall
                        // For incoming calls, backend also has activeCall from call:incoming
                        wsClient.emit("call:state", payload)
                        android.util.Log.i("CallStateReceiver", "Call active (callId=$callId)")
                    } catch (e: Exception) {
                        android.util.Log.e("CallStateReceiver", "Failed to report call active", e)
                    }
                }
            }

            TelephonyManager.EXTRA_STATE_IDLE -> {
                // Call ended
                val callId = ActiveCallState.callId ?: return
                scope.launch {
                    try {
                        val payload = JSONObject().apply {
                            put("callId", callId)
                        }
                        wsClient.emit("call:end", payload)
                        android.util.Log.i("CallStateReceiver", "Call ended (callId=$callId)")
                    } catch (e: Exception) {
                        android.util.Log.e("CallStateReceiver", "Failed to report call end", e)
                    }
                }
                ActiveCallState.clear()
            }
        }
    }
}
