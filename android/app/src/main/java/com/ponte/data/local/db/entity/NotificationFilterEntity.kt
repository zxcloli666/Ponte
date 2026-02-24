package com.ponte.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notification_filters")
data class NotificationFilterEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "package_name")
    val packageName: String,

    @ColumnInfo(name = "enabled")
    val enabled: Boolean = true
)
