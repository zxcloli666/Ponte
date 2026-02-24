package com.ponte.data.local.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "extra_numbers",
    foreignKeys = [
        ForeignKey(
            entity = SimEntity::class,
            parentColumns = ["id"],
            childColumns = ["sim_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("sim_id")]
)
data class ExtraNumberEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "sim_id")
    val simId: String,

    @ColumnInfo(name = "prefix")
    val prefix: String,

    @ColumnInfo(name = "phone_number")
    val phoneNumber: String,

    @ColumnInfo(name = "display_name")
    val displayName: String,

    @ColumnInfo(name = "display_number")
    val displayNumber: String,

    @ColumnInfo(name = "color")
    val color: String,

    @ColumnInfo(name = "sort_order")
    val sortOrder: Int = 0,

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
