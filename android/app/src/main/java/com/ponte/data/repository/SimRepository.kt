package com.ponte.data.repository

import android.content.Context
import android.telephony.SubscriptionManager
import com.ponte.data.local.db.dao.ExtraNumberDao
import com.ponte.data.local.db.dao.SimDao
import com.ponte.data.local.db.entity.ExtraNumberEntity
import com.ponte.data.local.db.entity.SimEntity
import com.ponte.data.remote.api.ExtraNumberRequest
import com.ponte.data.remote.api.PonteApi
import com.ponte.data.remote.api.dto.SimDto
import com.ponte.data.remote.api.dto.SimSyncRequest
import com.ponte.domain.model.ExtraNumber
import com.ponte.domain.model.Sim
import com.ponte.domain.repository.ISimRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SimRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val simDao: SimDao,
    private val extraNumberDao: ExtraNumberDao,
    private val ponteApi: PonteApi
) : ISimRepository {

    override fun observeSims(): Flow<List<Sim>> {
        return combine(
            simDao.observeAll(),
            extraNumberDao.observeAll()
        ) { simEntities, allExtras ->
            val extrasBySimId = allExtras.groupBy { it.simId }
            simEntities.map { entity ->
                val extras = extrasBySimId[entity.id]?.map { it.toDomain() } ?: emptyList()
                entity.toDomain(extras)
            }
        }
    }

    @Suppress("MissingPermission")
    override suspend fun readSimsFromDevice(): List<Sim> {
        val subscriptionManager = context.getSystemService(SubscriptionManager::class.java)
        val subscriptions = subscriptionManager.activeSubscriptionInfoList ?: return emptyList()

        return subscriptions.map { info ->
            val existing = simDao.getByIccId(info.iccId ?: "")
            Sim(
                id = existing?.id ?: UUID.randomUUID().toString(),
                subscriptionId = info.subscriptionId,
                slotIndex = info.simSlotIndex,
                iccId = info.iccId ?: "",
                carrierName = info.carrierName?.toString() ?: "Unknown",
                rawNumber = info.number,
                displayName = existing?.displayName ?: info.displayName?.toString() ?: "SIM ${info.simSlotIndex + 1}",
                displayNumber = existing?.displayNumber ?: info.number,
                color = existing?.color ?: DEFAULT_COLORS[info.simSlotIndex % DEFAULT_COLORS.size],
                isDefault = existing?.isDefault ?: (info.simSlotIndex == 0)
            )
        }
    }

    override suspend fun syncSimsToBackend(sims: List<Sim>): Result<List<Sim>> = runCatching {
        val request = SimSyncRequest(
            sims = sims.map { sim ->
                SimDto(
                    slotIndex = sim.slotIndex,
                    iccId = sim.iccId,
                    carrierName = sim.carrierName,
                    rawNumber = sim.rawNumber,
                    displayName = sim.displayName,
                    displayNumber = sim.displayNumber,
                    color = sim.color,
                    isDefault = sim.isDefault
                )
            }
        )
        val syncedSims = ponteApi.syncSims(request).data.map { dto ->
            Sim(
                id = dto.id,
                slotIndex = dto.slotIndex,
                iccId = dto.iccId,
                carrierName = dto.carrierName,
                rawNumber = dto.rawNumber,
                displayName = dto.displayName,
                displayNumber = dto.displayNumber,
                color = dto.color,
                isDefault = dto.isDefault
            )
        }

        // Persist to local DB
        simDao.upsertAll(syncedSims.map { it.toEntity() })
        simDao.deleteExcept(syncedSims.map { it.id })

        // Fetch full SIMs with extra numbers from backend and sync locally
        try {
            val fullSims = ponteApi.getSims().data
            for (simDto in fullSims) {
                simDto.extraNumbers?.forEach { extra ->
                    extraNumberDao.insert(
                        ExtraNumberEntity(
                            id = extra.id,
                            simId = extra.simId,
                            prefix = extra.prefix,
                            phoneNumber = extra.phoneNumber,
                            displayName = extra.displayName,
                            displayNumber = extra.displayNumber,
                            color = extra.color,
                            sortOrder = extra.sortOrder
                        )
                    )
                }
            }
        } catch (_: Exception) { /* extra numbers will stay from local DB */ }

        syncedSims
    }

    override suspend fun updateSim(sim: Sim) {
        simDao.update(sim.toEntity())
    }

    override suspend fun addExtraNumber(simId: String, extraNumber: ExtraNumber): Result<ExtraNumber> =
        runCatching {
            val response = ponteApi.createExtraNumber(
                simId,
                ExtraNumberRequest(
                    prefix = extraNumber.prefix,
                    phoneNumber = extraNumber.phoneNumber,
                    displayName = extraNumber.displayName,
                    displayNumber = extraNumber.displayNumber,
                    color = extraNumber.color,
                    sortOrder = extraNumber.sortOrder
                )
            )
            val backendExtra = response.data
            val entity = ExtraNumberEntity(
                id = backendExtra.id,
                simId = backendExtra.simId,
                prefix = backendExtra.prefix,
                phoneNumber = backendExtra.phoneNumber,
                displayName = backendExtra.displayName,
                displayNumber = backendExtra.displayNumber,
                color = backendExtra.color,
                sortOrder = backendExtra.sortOrder
            )
            extraNumberDao.insert(entity)
            entity.toDomain()
        }

    override suspend fun removeExtraNumber(id: String) {
        try {
            ponteApi.deleteExtraNumber(id)
        } catch (_: Exception) { /* delete locally anyway */ }
        extraNumberDao.deleteById(id)
    }

    override suspend fun getExtraNumbersForSim(simId: String): List<ExtraNumber> {
        return extraNumberDao.getBySimId(simId).map { it.toDomain() }
    }

    override suspend fun findExtraNumberByPrefix(simId: String, prefix: String): ExtraNumber? {
        return extraNumberDao.findByPrefix(simId, prefix)?.toDomain()
    }

    companion object {
        private val DEFAULT_COLORS = listOf("#4285F4", "#34A853", "#FBBC04", "#EA4335")
    }
}

// Extension functions for mapping between layers
private fun SimEntity.toDomain(extraNumbers: List<ExtraNumber> = emptyList()) = Sim(
    id = id,
    subscriptionId = subscriptionId,
    slotIndex = slotIndex,
    iccId = iccId,
    carrierName = carrierName,
    rawNumber = rawNumber,
    displayName = displayName,
    displayNumber = displayNumber,
    color = color,
    isDefault = isDefault,
    extraNumbers = extraNumbers
)

private fun Sim.toEntity() = SimEntity(
    id = id,
    subscriptionId = subscriptionId,
    slotIndex = slotIndex,
    iccId = iccId,
    carrierName = carrierName,
    rawNumber = rawNumber,
    displayName = displayName,
    displayNumber = displayNumber,
    color = color,
    isDefault = isDefault
)

private fun ExtraNumberEntity.toDomain() = ExtraNumber(
    id = id,
    simId = simId,
    prefix = prefix,
    phoneNumber = phoneNumber,
    displayName = displayName,
    displayNumber = displayNumber,
    color = color,
    sortOrder = sortOrder
)
