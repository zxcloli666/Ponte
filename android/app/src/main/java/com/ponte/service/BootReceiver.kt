package com.ponte.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ponte.data.local.prefs.SecurePrefs
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class BootReceiver : BroadcastReceiver() {

    @Inject lateinit var securePrefs: SecurePrefs

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        if (securePrefs.isPaired) {
            SyncForegroundService.start(context)
        }
    }
}
