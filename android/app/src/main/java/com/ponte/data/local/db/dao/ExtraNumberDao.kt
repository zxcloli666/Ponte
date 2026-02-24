package com.ponte.data.local.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.ponte.data.local.db.entity.ExtraNumberEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ExtraNumberDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ExtraNumberEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<ExtraNumberEntity>)

    @Update
    suspend fun update(entity: ExtraNumberEntity)

    @Query("SELECT * FROM extra_numbers ORDER BY sort_order ASC")
    fun observeAll(): Flow<List<ExtraNumberEntity>>

    @Query("SELECT * FROM extra_numbers WHERE sim_id = :simId ORDER BY sort_order ASC")
    fun observeBySimId(simId: String): Flow<List<ExtraNumberEntity>>

    @Query("SELECT * FROM extra_numbers WHERE sim_id = :simId ORDER BY sort_order ASC")
    suspend fun getBySimId(simId: String): List<ExtraNumberEntity>

    @Query("SELECT * FROM extra_numbers WHERE sim_id = :simId AND prefix = :prefix LIMIT 1")
    suspend fun findByPrefix(simId: String, prefix: String): ExtraNumberEntity?

    @Query("SELECT * FROM extra_numbers WHERE id = :id")
    suspend fun getById(id: String): ExtraNumberEntity?

    @Query("DELETE FROM extra_numbers WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM extra_numbers WHERE sim_id = :simId")
    suspend fun deleteBySimId(simId: String)
}
