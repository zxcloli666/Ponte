package com.ponte.data.repository

import android.content.ContentResolver
import android.content.Context
import android.provider.ContactsContract
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.local.db.dao.SyncStateDao
import com.ponte.data.local.db.entity.OutboxEntity
import com.ponte.data.local.db.entity.SyncStateEntity
import com.ponte.domain.model.Contact
import com.ponte.domain.model.ContactPhone
import com.ponte.domain.repository.IContactRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContactRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val outboxDao: OutboxDao,
    private val syncStateDao: SyncStateDao
) : IContactRepository {

    private val contentResolver: ContentResolver
        get() = context.contentResolver

    override suspend fun readAllFromDevice(): List<Contact> {
        return readContacts(selection = null, selectionArgs = null)
    }

    override suspend fun readChangedFromDevice(sinceTimestamp: Long): List<Contact> {
        return readContacts(
            selection = "${ContactsContract.Contacts.CONTACT_LAST_UPDATED_TIMESTAMP} > ?",
            selectionArgs = arrayOf(sinceTimestamp.toString())
        )
    }

    override suspend fun enqueueForSync(contacts: List<Contact>) {
        val batchSize = 50
        contacts.chunked(batchSize).forEach { batch ->
            val payload = JSONObject().apply {
                put("contacts", JSONArray().apply {
                    batch.forEach { contact ->
                        put(JSONObject().apply {
                            put("androidId", contact.androidId)
                            put("name", contact.name)
                            put("phones", JSONArray().apply {
                                contact.phones.forEach { phone ->
                                    put(JSONObject().apply {
                                        put("number", phone.number)
                                        put("type", phone.type)
                                        put("label", phone.label)
                                    })
                                }
                            })
                            contact.photoBase64?.let { put("photoUrl", it) }
                        })
                    }
                })
            }
            val entity = OutboxEntity(
                eventType = "contact",
                payload = payload.toString(),
                androidId = "contact_batch_${batch.first().androidId}_${batch.last().androidId}",
                createdAt = System.currentTimeMillis()
            )
            outboxDao.insert(entity)
        }
    }

    override suspend fun getLastSyncTimestamp(): Long? {
        return syncStateDao.getLastSyncedAt(DATA_TYPE)
    }

    override suspend fun updateLastSyncTimestamp(timestamp: Long) {
        syncStateDao.upsert(
            SyncStateEntity(
                dataType = DATA_TYPE,
                lastSyncedAt = timestamp
            )
        )
    }

    private fun readContacts(selection: String?, selectionArgs: Array<String>?): List<Contact> {
        val contactMap = mutableMapOf<String, Contact>()

        contentResolver.query(
            ContactsContract.Contacts.CONTENT_URI,
            arrayOf(
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
                ContactsContract.Contacts.PHOTO_URI,
                ContactsContract.Contacts.CONTACT_LAST_UPDATED_TIMESTAMP
            ),
            selection,
            selectionArgs,
            ContactsContract.Contacts.DISPLAY_NAME_PRIMARY
        )?.use { cursor ->
            val idIdx = cursor.getColumnIndexOrThrow(ContactsContract.Contacts._ID)
            val nameIdx = cursor.getColumnIndexOrThrow(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY)
            val photoIdx = cursor.getColumnIndexOrThrow(ContactsContract.Contacts.PHOTO_URI)
            val updatedIdx = cursor.getColumnIndexOrThrow(ContactsContract.Contacts.CONTACT_LAST_UPDATED_TIMESTAMP)

            while (cursor.moveToNext()) {
                val contactId = cursor.getString(idIdx)
                val name = cursor.getString(nameIdx) ?: continue
                contactMap[contactId] = Contact(
                    androidId = contactId,
                    name = name,
                    phones = emptyList(),
                    photoBase64 = cursor.getString(photoIdx),
                    updatedAt = cursor.getLong(updatedIdx)
                )
            }
        }

        // Load phone numbers for each contact
        for ((contactId, contact) in contactMap) {
            val phones = mutableListOf<ContactPhone>()
            contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                arrayOf(
                    ContactsContract.CommonDataKinds.Phone.NUMBER,
                    ContactsContract.CommonDataKinds.Phone.TYPE,
                    ContactsContract.CommonDataKinds.Phone.LABEL
                ),
                "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
                arrayOf(contactId),
                null
            )?.use { phoneCursor ->
                val numIdx = phoneCursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER)
                val typeIdx = phoneCursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.TYPE)
                val labelIdx = phoneCursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.LABEL)

                while (phoneCursor.moveToNext()) {
                    phones.add(
                        ContactPhone(
                            number = phoneCursor.getString(numIdx) ?: continue,
                            type = ContactsContract.CommonDataKinds.Phone.getTypeLabel(
                                context.resources,
                                phoneCursor.getInt(typeIdx),
                                phoneCursor.getString(labelIdx) ?: ""
                            ).toString(),
                            label = phoneCursor.getString(labelIdx) ?: ""
                        )
                    )
                }
            }
            contactMap[contactId] = contact.copy(phones = phones)
        }

        return contactMap.values.toList()
    }

    companion object {
        private const val DATA_TYPE = "contact"
    }
}
