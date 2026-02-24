package com.ponte.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.ponte.data.local.db.entity.SimEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SimDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAllIgnore(sims: List<SimEntity>)

    @Update
    suspend fun updateAll(sims: List<SimEntity>)

    /**
     * Upsert: insert new SIMs, update existing ones.
     * Uses IGNORE + UPDATE to avoid CASCADE DELETE of extra_numbers.
     */
    @Transaction
    suspend fun upsertAll(sims: List<SimEntity>) {
        insertAllIgnore(sims)
        updateAll(sims)
    }

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertIgnore(sim: SimEntity)

    /**
     * Upsert single SIM without triggering CASCADE DELETE.
     */
    @Transaction
    suspend fun upsert(sim: SimEntity) {
        insertIgnore(sim)
        update(sim)
    }

    @Update
    suspend fun update(sim: SimEntity)

    @Query("SELECT * FROM sims ORDER BY slot_index ASC")
    fun observeAll(): Flow<List<SimEntity>>

    @Query("SELECT * FROM sims ORDER BY slot_index ASC")
    suspend fun getAll(): List<SimEntity>

    @Query("SELECT * FROM sims WHERE id = :id")
    suspend fun getById(id: String): SimEntity?

    @Query("SELECT * FROM sims WHERE slot_index = :slotIndex LIMIT 1")
    suspend fun getBySlotIndex(slotIndex: Int): SimEntity?

    @Query("SELECT * FROM sims WHERE icc_id = :iccId LIMIT 1")
    suspend fun getByIccId(iccId: String): SimEntity?

    @Query("SELECT * FROM sims WHERE subscription_id = :subscriptionId LIMIT 1")
    suspend fun getBySubscriptionId(subscriptionId: Int): SimEntity?

    @Query("DELETE FROM sims WHERE id NOT IN (:keepIds)")
    suspend fun deleteExcept(keepIds: List<String>)

    @Query("DELETE FROM sims")
    suspend fun deleteAll()
}
