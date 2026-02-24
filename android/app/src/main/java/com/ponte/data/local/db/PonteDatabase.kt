package com.ponte.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.ponte.data.local.db.dao.ExtraNumberDao
import com.ponte.data.local.db.dao.NotificationFilterDao
import com.ponte.data.local.db.dao.OutboxDao
import com.ponte.data.local.db.dao.SimDao
import com.ponte.data.local.db.dao.SyncStateDao
import com.ponte.data.local.db.entity.ExtraNumberEntity
import com.ponte.data.local.db.entity.NotificationFilterEntity
import com.ponte.data.local.db.entity.OutboxEntity
import com.ponte.data.local.db.entity.SimEntity
import com.ponte.data.local.db.entity.SyncStateEntity

@Database(
    entities = [
        OutboxEntity::class,
        SimEntity::class,
        ExtraNumberEntity::class,
        NotificationFilterEntity::class,
        SyncStateEntity::class
    ],
    version = 2,
    exportSchema = true
)
abstract class PonteDatabase : RoomDatabase() {
    abstract fun outboxDao(): OutboxDao
    abstract fun simDao(): SimDao
    abstract fun extraNumberDao(): ExtraNumberDao
    abstract fun notificationFilterDao(): NotificationFilterDao
    abstract fun syncStateDao(): SyncStateDao

    companion object {
        const val NAME = "ponte.db"
    }
}
