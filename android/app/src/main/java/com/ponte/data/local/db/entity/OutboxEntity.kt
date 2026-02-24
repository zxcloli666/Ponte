package com.ponte.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "outbox_messages")
data class OutboxEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "event_type")
    val eventType: String,

    @ColumnInfo(name = "payload")
    val payload: String,

    @ColumnInfo(name = "android_id")
    val androidId: String,

    @ColumnInfo(name = "attempts")
    val attempts: Int = 0,

    @ColumnInfo(name = "next_retry_at")
    val nextRetryAt: Long = 0,

    @ColumnInfo(name = "status")
    val status: String = "pending",

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
