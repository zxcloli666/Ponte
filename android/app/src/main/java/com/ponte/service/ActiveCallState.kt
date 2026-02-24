package com.ponte.service

/**
 * Shared singleton tracking the current active call's backend callId.
 * Used by CallStateReceiver and SyncForegroundService to coordinate
 * call state reporting to the backend.
 */
object ActiveCallState {
    @Volatile var callId: String? = null
    @Volatile var isWebInitiated: Boolean = false

    fun set(callId: String, webInitiated: Boolean) {
        this.callId = callId
        this.isWebInitiated = webInitiated
    }

    fun clear() {
        callId = null
        isWebInitiated = false
    }
}
