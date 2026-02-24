package com.ponte.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_state")
data class SyncStateEntity(
    @PrimaryKey
    @ColumnInfo(name = "data_type")
    val dataType: String,

    @ColumnInfo(name = "last_synced_id")
    val lastSyncedId: String? = null,

    @ColumnInfo(name = "last_synced_at")
    val lastSyncedAt: Long = 0
)
