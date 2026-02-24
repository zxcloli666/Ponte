package com.ponte.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.ponte.data.local.db.entity.OutboxEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OutboxDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: OutboxEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<OutboxEntity>)

    @Update
    suspend fun update(entity: OutboxEntity)

    @Query("SELECT * FROM outbox_messages WHERE status = 'pending' AND next_retry_at <= :now ORDER BY created_at ASC LIMIT :limit")
    suspend fun getPendingMessages(now: Long = System.currentTimeMillis(), limit: Int = 50): List<OutboxEntity>

    @Query("SELECT * FROM outbox_messages WHERE status = 'sent' AND android_id = :androidId LIMIT 1")
    suspend fun findSentByAndroidId(androidId: String): OutboxEntity?

    @Query("SELECT * FROM outbox_messages WHERE status = 'pending' AND android_id = :androidId LIMIT 1")
    suspend fun findPendingByAndroidId(androidId: String): OutboxEntity?

    @Query("UPDATE outbox_messages SET status = 'sent', next_retry_at = :sentAt WHERE id = :id")
    suspend fun markSent(id: Long, sentAt: Long = System.currentTimeMillis())

    @Query("UPDATE outbox_messages SET status = 'acked' WHERE android_id = :androidId")
    suspend fun markAcked(androidId: String)

    @Query("UPDATE outbox_messages SET attempts = attempts + 1, next_retry_at = :nextRetryAt WHERE id = :id")
    suspend fun incrementAttempts(id: Long, nextRetryAt: Long)

    @Query("DELETE FROM outbox_messages WHERE status = 'acked'")
    suspend fun deleteAcked()

    @Query("SELECT COUNT(*) FROM outbox_messages WHERE status = 'pending'")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM outbox_messages WHERE status != 'acked'")
    suspend fun getUnackedCount(): Int

    @Query("UPDATE outbox_messages SET status = 'pending' WHERE status = 'sent' AND next_retry_at <= :staleBefore")
    suspend fun resetStaleSent(staleBefore: Long)
}
