package com.ponte.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ponte.data.local.db.entity.NotificationFilterEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NotificationFilterDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: NotificationFilterEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<NotificationFilterEntity>)

    @Query("SELECT * FROM notification_filters ORDER BY package_name ASC")
    fun observeAll(): Flow<List<NotificationFilterEntity>>

    @Query("SELECT * FROM notification_filters ORDER BY package_name ASC")
    suspend fun getAll(): List<NotificationFilterEntity>

    @Query("SELECT * FROM notification_filters WHERE package_name = :packageName LIMIT 1")
    suspend fun getByPackageName(packageName: String): NotificationFilterEntity?

    @Query("UPDATE notification_filters SET enabled = :enabled WHERE package_name = :packageName")
    suspend fun setEnabled(packageName: String, enabled: Boolean)

    @Query("SELECT enabled FROM notification_filters WHERE package_name = :packageName")
    suspend fun isEnabled(packageName: String): Boolean?

    @Query("DELETE FROM notification_filters WHERE package_name = :packageName")
    suspend fun deleteByPackageName(packageName: String)
}
