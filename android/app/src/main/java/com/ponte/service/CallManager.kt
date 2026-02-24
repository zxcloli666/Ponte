package com.ponte.service

import android.telecom.Call
import android.telecom.VideoProfile
import com.ponte.data.local.db.dao.SimDao
import com.ponte.data.remote.ws.WsClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

/**
 * Singleton managing active telephony call state.
 * Bridges InCallService (system call events) with WsClient (backend communication).
 */
object CallManager {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Injected by PonteInCallService or SyncForegroundService
    var wsClient: WsClient? = null
    var simDao: SimDao? = null

    private var currentCall: Call? = null
    @Volatile var currentCallId: String? = null
        private set

    private val stateCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            try {
                val callId = currentCallId ?: return
                val ws = wsClient ?: return

                scope.launch {
                    try {
                        when (state) {
                            Call.STATE_ACTIVE -> {
                                val payload = JSONObject().apply {
                                    put("callId", callId)
                                    put("status", "active")
                                }
                                ws.emit("call:state", payload)
                                android.util.Log.i("CallManager", "Call active (callId=$callId)")
                            }
                            Call.STATE_DISCONNECTED -> {
                                val payload = JSONObject().apply {
                                    put("callId", callId)
                                }
                                ws.emit("call:end", payload)
                                android.util.Log.i("CallManager", "Call ended (callId=$callId)")
                            }
                            else -> {
                                android.util.Log.d("CallManager", "Call state=$state (callId=$callId)")
                            }
                        }
                    } catch (e: Exception) {
                        android.util.Log.e("CallManager", "Failed to report call state", e)
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("CallManager", "Error in state callback", e)
            }
        }
    }

    fun onCallAdded(call: Call) {
        currentCall = call
        call.registerCallback(stateCallback)

        val state = call.state
        val isIncoming = state == Call.STATE_RINGING

        android.util.Log.d("CallManager", "onCallAdded: state=$state, isIncoming=$isIncoming")

        if (isIncoming) {
            val callId = UUID.randomUUID().toString()
            currentCallId = callId
            ActiveCallState.set(callId, webInitiated = false)

            val number = try {
                call.details?.handle?.schemeSpecificPart ?: "unknown"
            } catch (e: Exception) {
                "unknown"
            }
            reportIncomingCall(callId, number)
        } else {
            // Outgoing call — ActiveCallState.callId is pre-set by handleCallInitiate for web-initiated calls
            val existingId = ActiveCallState.callId
            if (existingId != null) {
                currentCallId = existingId
                android.util.Log.d("CallManager", "Outgoing call using existing callId=$existingId")
            } else {
                // Call placed directly from the phone (not from web)
                val callId = UUID.randomUUID().toString()
                currentCallId = callId
                ActiveCallState.set(callId, webInitiated = false)
                android.util.Log.d("CallManager", "Outgoing call (phone-initiated) callId=$callId")
            }
        }
    }

    fun onCallRemoved(call: Call) {
        try {
            call.unregisterCallback(stateCallback)
        } catch (e: Exception) {
            android.util.Log.e("CallManager", "Error unregistering callback", e)
        }
        currentCall = null
        currentCallId = null
        ActiveCallState.clear()
    }

    fun answer() {
        try {
            currentCall?.answer(VideoProfile.STATE_AUDIO_ONLY)
            android.util.Log.i("CallManager", "answer() called")
        } catch (e: Exception) {
            android.util.Log.e("CallManager", "Error in answer()", e)
        }
    }

    fun reject() {
        try {
            currentCall?.reject(false, null)
            android.util.Log.i("CallManager", "reject() called")
        } catch (e: Exception) {
            android.util.Log.e("CallManager", "Error in reject()", e)
        }
    }

    fun disconnect() {
        try {
            currentCall?.disconnect()
            android.util.Log.i("CallManager", "disconnect() called")
        } catch (e: Exception) {
            android.util.Log.e("CallManager", "Error in disconnect()", e)
        }
    }

    fun hasActiveCall(): Boolean = currentCall != null

    private fun reportIncomingCall(callId: String, number: String) {
        val ws = wsClient ?: run {
            android.util.Log.w("CallManager", "wsClient is null, can't report incoming call")
            return
        }
        scope.launch {
            try {
                val sims = simDao?.getAll() ?: run {
                    android.util.Log.w("CallManager", "simDao is null")
                    return@launch
                }
                val sim = sims.firstOrNull { it.isDefault } ?: sims.firstOrNull()
                if (sim == null) {
                    android.util.Log.w("CallManager", "No SIM found for incoming call")
                    return@launch
                }

                val payload = JSONObject().apply {
                    put("callId", callId)
                    put("from", number)
                    put("simId", sim.id)
                }
                ws.emit("call:incoming", payload)
                android.util.Log.i("CallManager", "Incoming call reported: $number (callId=$callId)")
            } catch (e: Exception) {
                android.util.Log.e("CallManager", "Failed to report incoming call", e)
            }
        }
    }
}
