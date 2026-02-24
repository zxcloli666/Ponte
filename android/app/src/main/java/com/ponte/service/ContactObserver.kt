package com.ponte.service

import android.content.Context
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import com.ponte.domain.usecase.SyncContactsUseCase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Observes changes to the ContactsContract and triggers a delta sync.
 * Debounces rapid changes (e.g. batch contact imports) to avoid excessive syncs.
 */
class ContactObserver(
    private val context: Context,
    private val syncContactsUseCase: SyncContactsUseCase,
    private val scope: CoroutineScope
) : ContentObserver(Handler(Looper.getMainLooper())) {

    private var debounceJob: Job? = null

    fun register() {
        context.contentResolver.registerContentObserver(
            ContactsContract.Contacts.CONTENT_URI,
            true,
            this
        )
    }

    fun unregister() {
        context.contentResolver.unregisterContentObserver(this)
        debounceJob?.cancel()
    }

    override fun onChange(selfChange: Boolean, uri: Uri?) {
        debounceJob?.cancel()
        debounceJob = scope.launch(Dispatchers.IO) {
            delay(DEBOUNCE_MS)
            syncContactsUseCase(fullSync = false)
        }
    }

    companion object {
        private const val DEBOUNCE_MS = 3000L
    }
}
