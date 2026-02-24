package com.ponte.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sims")
data class SimEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "subscription_id")
    val subscriptionId: Int = -1,

    @ColumnInfo(name = "slot_index")
    val slotIndex: Int,

    @ColumnInfo(name = "icc_id")
    val iccId: String,

    @ColumnInfo(name = "carrier_name")
    val carrierName: String,

    @ColumnInfo(name = "raw_number")
    val rawNumber: String?,

    @ColumnInfo(name = "display_name")
    val displayName: String,

    @ColumnInfo(name = "display_number")
    val displayNumber: String?,

    @ColumnInfo(name = "color")
    val color: String,

    @ColumnInfo(name = "is_default")
    val isDefault: Boolean = false,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
