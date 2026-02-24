package com.ponte.domain.usecase

import com.ponte.domain.model.DeviceInfo
import com.ponte.domain.repository.IAuthRepository
import com.ponte.domain.repository.ISimRepository
import javax.inject.Inject

class PairDeviceUseCase @Inject constructor(
    private val authRepository: IAuthRepository,
    private val simRepository: ISimRepository
) {
    suspend operator fun invoke(pairingToken: String, deviceInfo: DeviceInfo): Result<Unit> {
        val pairResult = authRepository.pair(pairingToken, deviceInfo)
        if (pairResult.isFailure) return pairResult

        // After successful pairing, sync SIMs
        val sims = simRepository.readSimsFromDevice()
        if (sims.isNotEmpty()) {
            simRepository.syncSimsToBackend(sims)
        }

        return Result.success(Unit)
    }
}
