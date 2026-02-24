package com.ponte.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity

/**
 * Minimal dialer activity required for Ponte to be eligible as default dialer.
 * Handles DIAL intents by forwarding to MainActivity, then finishes immediately.
 * Uses Theme.NoDisplay — no UI is shown.
 */
class DialerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val number = intent?.data?.schemeSpecificPart
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            if (number != null) {
                putExtra("dial_number", number)
            }
        }
        startActivity(mainIntent)
        finish()
    }
}
