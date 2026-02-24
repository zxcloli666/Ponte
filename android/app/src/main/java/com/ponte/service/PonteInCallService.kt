package com.ponte.service

import android.telecom.Call
import android.telecom.InCallService
import com.ponte.data.local.db.dao.SimDao
import com.ponte.data.remote.ws.WsClient
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent

/**
 * InCallService that handles all telephony calls silently in the background.
 * When Ponte is set as the default dialer, this service receives all call events
 * and provides no UI — calls are managed entirely from the web.
 *
 * Uses Hilt EntryPointAccessors instead of @AndroidEntryPoint for reliability
 * since InCallService has a special lifecycle managed by the Telecom framework.
 */
class PonteInCallService : InCallService() {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface PonteInCallEntryPoint {
        fun wsClient(): WsClient
        fun simDao(): SimDao
    }

    override fun onCreate() {
        super.onCreate()
        try {
            val entryPoint = EntryPointAccessors.fromApplication(
                applicationContext,
                PonteInCallEntryPoint::class.java
            )
            CallManager.wsClient = entryPoint.wsClient()
            CallManager.simDao = entryPoint.simDao()
            android.util.Log.i("PonteInCallService", "InCallService created, dependencies injected")
        } catch (e: Exception) {
            android.util.Log.e("PonteInCallService", "Failed to initialize dependencies", e)
        }
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        try {
            CallManager.onCallAdded(call)
            android.util.Log.i("PonteInCallService", "Call added: state=${call.state}, handle=${call.details?.handle}")
        } catch (e: Exception) {
            android.util.Log.e("PonteInCallService", "Error in onCallAdded", e)
        }
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        try {
            CallManager.onCallRemoved(call)
            android.util.Log.i("PonteInCallService", "Call removed")
        } catch (e: Exception) {
            android.util.Log.e("PonteInCallService", "Error in onCallRemoved", e)
        }
    }
}
