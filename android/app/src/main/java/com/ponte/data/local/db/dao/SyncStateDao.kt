package com.ponte.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.ponte.data.local.db.entity.SyncStateEntity

@Dao
interface SyncStateDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: SyncStateEntity)

    @Query("SELECT * FROM sync_state WHERE data_type = :dataType")
    suspend fun get(dataType: String): SyncStateEntity?

    @Query("SELECT last_synced_id FROM sync_state WHERE data_type = :dataType")
    suspend fun getLastSyncedId(dataType: String): String?

    @Query("SELECT last_synced_at FROM sync_state WHERE data_type = :dataType")
    suspend fun getLastSyncedAt(dataType: String): Long?

    @Query("DELETE FROM sync_state")
    suspend fun deleteAll()
}
