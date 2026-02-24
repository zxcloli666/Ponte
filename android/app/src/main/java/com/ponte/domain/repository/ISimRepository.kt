package com.ponte.domain.repository

import com.ponte.domain.model.ExtraNumber
import com.ponte.domain.model.Sim
import kotlinx.coroutines.flow.Flow

interface ISimRepository {
    fun observeSims(): Flow<List<Sim>>
    suspend fun readSimsFromDevice(): List<Sim>
    suspend fun syncSimsToBackend(sims: List<Sim>): Result<List<Sim>>
    suspend fun updateSim(sim: Sim)
    suspend fun addExtraNumber(simId: String, extraNumber: ExtraNumber): Result<ExtraNumber>
    suspend fun removeExtraNumber(id: String)
    suspend fun getExtraNumbersForSim(simId: String): List<ExtraNumber>
    suspend fun findExtraNumberByPrefix(simId: String, prefix: String): ExtraNumber?
}
